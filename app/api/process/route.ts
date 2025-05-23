import { NextRequest, NextResponse } from 'next/server';
import { parseResponse } from '../../../lib/parseResponse';

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const API_URL = 'http://grasp:8000/process/';

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to fetch.');
    }


    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('multipart/form-data')) {
      throw new Error('Unexpected response format.');
    }

    const data = await parseResponse(response);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
