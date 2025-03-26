import { NextResponse } from 'next/server';

interface ManyChatMessage {
  type: string;
  text: string;
}

interface ManyChatRequestBody {
  subscriberId: string;
  message?: string;
  messages?: ManyChatMessage[];
  customFields?: Record<string, any>;
  ent: 'ENT1' | 'ENT2' | 'ENT3';
}

// Map of ENT to page IDs
const PAGE_IDS = {
  ENT1: "568686842996533",
  ENT2: "589281880929856",
  ENT3: "510130002192941"
} as const;

// Map of ENT to API keys
const getApiKey = (ent: 'ENT1' | 'ENT2' | 'ENT3'): string | undefined => {
  switch (ent) {
    case 'ENT1':
      return process.env.NEXT_PUBLIC_MANYCHAT_API_KEY_ENT1;
    case 'ENT2':
      return process.env.NEXT_PUBLIC_MANYCHAT_API_KEY_ENT2;
    case 'ENT3':
      return process.env.NEXT_PUBLIC_MANYCHAT_API_KEY_ENT3;
  }
};

export async function POST(request: Request) {
  try {
    const { subscriberId, message, messages, customFields, ent }: ManyChatRequestBody = await request.json();

    if (!ent) {
      return NextResponse.json(
        { error: 'ENT parameter is required' },
        { status: 400 }
      );
    }

    // Get the appropriate API key and page ID
    const apiKey = getApiKey(ent);
    const pageId = PAGE_IDS[ent];

    if (!apiKey) {
      console.error(`API key not found for ${ent}`);
      return NextResponse.json(
        { error: 'API key configuration error' },
        { status: 500 }
      );
    }

    // Prepare the message content
    const messageContent = messages || [
      {
        type: "text",
        text: message || "Congratulations! Your registration has been approved. Welcome to our gaming community! 🎮"
      }
    ];

    // Prepare the request body
    const requestBody: {
      subscriber_id: string;
      data: {
        version: string;
        content: {
          messages: ManyChatMessage[];
        };
        custom_fields?: Record<string, any>;
      };
    } = {
      subscriber_id: subscriberId,
      data: {
        version: "v2",
        content: {
          messages: messageContent
        }
      }
    };

    // Add custom fields if provided
    if (customFields) {
      requestBody.data.custom_fields = customFields;
    }

    console.log(`Sending ManyChat request for ${ent} (Page ID: ${pageId}) with API key: ${apiKey.substring(0, 10)}...`);

    const response = await fetch('https://api.manychat.com/fb/sending/sendContent', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('ManyChat API error:', errorData);
      return NextResponse.json(
        { error: 'Failed to send message', details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Error in ManyChat API route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 