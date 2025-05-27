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
      // Attempt to parse the error response from the GRaSP API
      let errorMessage = `GRaSP API request failed with status ${response.status}`;
      try {
        const errorData = await response.json();
        // Look for common error fields in the response
        const message = errorData.error || errorData.message || errorData.detail || JSON.stringify(errorData);
        errorMessage = `GRaSP API error: ${message} (Status: ${response.status})`;
      } catch (parseError) {
        // If parsing fails, use the status text or a generic message
        errorMessage = `GRaSP API request failed: ${response.statusText || 'Unknown error'} (Status: ${response.status})`;
      }
      throw new Error(errorMessage);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('multipart/form-data')) {
      throw new Error('Unexpected response format from GRaSP API.');
    }

    const data = await parseResponse(response);
    return NextResponse.json(data);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}