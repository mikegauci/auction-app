import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('videoId');
    
    const didApiKey = process.env.DID_API_KEY;
    
    if (!didApiKey) {
      return NextResponse.json(
        { error: 'D-ID API key not configured' },
        { status: 500 }
      );
    }

    if (!videoId) {
      return NextResponse.json(
        { error: 'Video ID is required' },
        { status: 400 }
      );
    }

    // Check video status with D-ID Clips API
    const response = await fetch(`https://api.d-id.com/clips/${videoId}`, {
      headers: {
        'Authorization': `Basic ${btoa(didApiKey)}`,
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      return NextResponse.json(
        { error: data.message || 'Failed to check video status' },
        { status: response.status }
      );
    }

    return NextResponse.json({
      status: data.status,
      result_url: data.result_url || null
    });
  } catch (error) {
    console.error('Error in check-video-status API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 