import { EntCode, FlowCode, MANYCHAT_FLOWS } from './manychat_config'

interface SendFlowResponse {
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

/**
 * Sends a flow to a ManyChat subscriber through our Next.js API route
 * @param subscriber_id The ManyChat subscriber ID
 * @param flowCode The flow code to send (e.g., 'WELCOME_FLOW', 'GAME_START_FLOW')
 * @param entCode Enterprise code to determine which API key to use
 * @returns Promise with the API response
 */
export async function sendFlow(
  subscriber_id: string | number,
  flowCode: FlowCode,
  entCode: EntCode
): Promise<SendFlowResponse> {
  console.log('sendFlow called with:', { subscriber_id, flowCode, entCode })

  // Get the flow namespace from the flow code
  const flow_ns = MANYCHAT_FLOWS[flowCode]
  if (!flow_ns) {
    throw new Error(`Invalid flow code: ${flowCode}`)
  }

  try {
    console.log('Making request to internal API route with:', {
      subscriber_id,
      flow_ns,
      entCode
    })

    const response = await fetch('/api/manychat/send-flow', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        subscriber_id,
        flow_ns,
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

    return data as SendFlowResponse
  } catch (error) {
    console.error('Error sending ManyChat flow:', error)
    throw error
  }
}

// Example usage:
// await sendFlow(
//   "123456789", // subscriber_id
//   'WELCOME_FLOW', // Type-safe flow code
//   'ENT-2'  // Works with both 'ENT2' and 'ENT-2'
// ) 