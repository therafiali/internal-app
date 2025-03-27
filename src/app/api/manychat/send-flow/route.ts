import { NextResponse } from 'next/server';
import { EntCode, MANYCHAT_ENDPOINTS, MANYCHAT_FLOWS, MANYCHAT_API_KEYS, FlowCode } from '@/app/services/manychat_config';

function getApiKey(entCode: EntCode): string | undefined {
  const normalizedEntCode = entCode.replace('-', '');
  return MANYCHAT_API_KEYS[normalizedEntCode];
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('Received raw request body:', body);

    const { subscriber_id, flow_ns, entCode } = body;

    // Validate each field individually for better error messages
    const missingFields = [];
    if (!subscriber_id) missingFields.push('subscriber_id');
    if (!flow_ns) missingFields.push('flow_ns');
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

    console.log('Processing request with:', { entCode, subscriber_id, flow_ns });

    // Validate flow_ns is a valid flow ID
    const validFlowIds = Object.values(MANYCHAT_FLOWS);
    if (!validFlowIds.includes(flow_ns)) {
      console.error('Invalid flow_ns:', flow_ns);
      return NextResponse.json(
        { 
          error: 'Invalid flow_ns. Must be one of the predefined flow IDs.',
          validFlows: Object.keys(MANYCHAT_FLOWS).reduce((acc, key) => {
            acc[key] = MANYCHAT_FLOWS[key as FlowCode];
            return acc;
          }, {} as Record<string, string>),
          received: { flow_ns }
        },
        { status: 400 }
      );
    }

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

    console.log('Making request to ManyChat API with:', { subscriber_id, flow_ns });
    const response = await fetch(MANYCHAT_ENDPOINTS.SEND_FLOW, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        subscriber_id,
        flow_ns
      })
    });

    const data = await response.json();
    console.log('ManyChat API response:', { status: response.status, data });

    if (!response.ok) {
      console.error('ManyChat API error:', { 
        status: response.status, 
        data,
        subscriber_id,
        flow_ns,
        entCode
      });
      return NextResponse.json(
        { 
          error: data.error?.message || data.error || 'Failed to send flow',
          details: data
        },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in ManyChat send-flow API route:', error);
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