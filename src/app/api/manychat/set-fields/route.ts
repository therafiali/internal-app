import { NextResponse } from 'next/server';
import { EntCode, MANYCHAT_ENDPOINTS, MANYCHAT_API_KEYS } from '@/app/services/manychat_config';

// API Keys for different enterprises
const MANYCHAT_API_KEY_ENT_2='589281880929856:f35f2220b71a660a7f9cf822423675b3';
const MANYCHAT_API_KEY_ENT_1='568686842996533:c06b17396c81aeb16cf42b17446313af';
const MANYCHAT_API_KEY_ENT_3='510130002192941:559a7ee52c00432f91c4a617874cfbb1';

function getApiKey(entCode: EntCode): string | undefined {
  const normalizedEntCode = entCode.replace('-', '');
  return MANYCHAT_API_KEYS[normalizedEntCode];
}

interface ManyChatField {
  field_name: string;
  field_value: string | number | boolean;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('Received raw request body:', body);

    const { subscriber_id, fields, entCode } = body;

    // Validate each field individually for better error messages
    const missingFields = [];
    if (!subscriber_id) missingFields.push('subscriber_id');
    if (!Array.isArray(fields)) missingFields.push('fields (must be an array)');
    if (!entCode) missingFields.push('entCode');

    if (missingFields.length > 0) {
      const errorMessage = `Missing required fields: ${missingFields.join(', ')}`;
      console.error(errorMessage, { received: body });
      return NextResponse.json(
        { 
          error: errorMessage,
          received: body
        },
        { status: 400 }
      );
    }

    // Validate field values
    const validationErrors = fields.map((field: ManyChatField, index) => {
      if (typeof field.field_value === 'string' && (field.field_value === 'true' || field.field_value === 'false')) {
        // Convert string boolean to actual boolean
        fields[index] = {
          ...field,
          field_value: field.field_value === 'true'
        };
        return null;
      }
      if (field.field_value === true || field.field_value === false) {
        return null;
      }
      return `Field "${field.field_name}" has invalid boolean value: ${field.field_value}`;
    }).filter(Boolean);

    if (validationErrors.length > 0) {
      return NextResponse.json(
        {
          error: 'Invalid field values',
          details: validationErrors
        },
        { status: 400 }
      );
    }

    console.log('Processing request with:', { entCode, subscriber_id, fields });

    const apiKey = getApiKey(entCode as EntCode);
    if (!apiKey) {
      console.error('API key not found for enterprise:', entCode);
      return NextResponse.json(
        { 
          error: `ManyChat API key not found for enterprise ${entCode}`,
          validEnterprises: Object.keys(MANYCHAT_API_KEYS)
        },
        { status: 400 }
      );
    }

    console.log('Making request to ManyChat API with:', { subscriber_id, fields });
    const response = await fetch(MANYCHAT_ENDPOINTS.SET_CUSTOM_FIELDS, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        subscriber_id,
        fields
      })
    });

    const data = await response.json();
    console.log('ManyChat API response:', { status: response.status, data });

    if (!response.ok) {
      console.error('ManyChat API error:', { 
        status: response.status, 
        data,
        subscriber_id,
        fields,
        entCode
      });
      return NextResponse.json(
        { 
          error: data.error?.message || data.error || 'Failed to set subscriber custom fields',
          details: data
        },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in ManyChat set-fields API route:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { 
        error: errorMessage,
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
} 