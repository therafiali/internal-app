interface ManyChatField {
  field_name: string
  field_value: string | number | boolean
}

interface SetCustomFieldsResponse {
  status: string
  data?: any
  error?: {
    message: string
    code: string
  }
}

interface ErrorResponse {
  error: string
  details?: any
}

type EntCode = 'ENT1' | 'ENT2' | 'ENT3' | 'ENT-1' | 'ENT-2' | 'ENT-3'

/**
 * Sets custom fields for a ManyChat subscriber through our Next.js API route
 * @param subscriber_id The ManyChat subscriber ID
 * @param fields Array of fields with their values to set
 * @param entCode Enterprise code to determine which API key to use
 * @returns Promise with the API response
 */
export async function setBotFields(
  subscriber_id: string | number,
  fields: ManyChatField[],
  entCode: EntCode
): Promise<SetCustomFieldsResponse> {
  console.log('setBotFields called with:', { subscriber_id, fields, entCode })

  // Ensure boolean values are properly formatted
  const formattedFields = fields.map(field => {
    // If the value is a string 'true' or 'false', convert it to actual boolean
    if (field.field_value === 'true' || field.field_value === 'false') {
      return {
        ...field,
        field_value: field.field_value === 'true'
      }
    }
    // If it's already a boolean or other type, keep as is
    return field
  })

  try {
    console.log('Making request to internal API route with formatted fields:', {
      subscriber_id,
      fields: formattedFields,
      entCode
    })

    const response = await fetch('/api/manychat/set-fields', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        subscriber_id,
        fields: formattedFields,
        entCode
      })
    })

    const data = await response.json()
    console.log('API response:', { status: response.status, data })

    if (!response.ok) {
      const errorData = data as ErrorResponse
      console.error('Error details:', {
        status: response.status,
        error: errorData.error,
        details: errorData.details
      })
      throw new Error(
        `ManyChat API Error: ${errorData.error}${
          errorData.details ? `\nDetails: ${JSON.stringify(errorData.details, null, 2)}` : ''
        }`
      )
    }

    return data as SetCustomFieldsResponse
  } catch (error) {
    console.error('Error setting ManyChat subscriber fields:', error)
    throw error
  }
}

// Example usage:
// await setBotFields(
//   "123456789", // subscriber_id
//   [{
//     field_name: "example_field",
//     field_value: true  // Use actual boolean, not string
//   }],
//   'ENT-2'  // Works with both 'ENT2' and 'ENT-2'
// )
