import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Helper function to call edge functions using supabaseAdmin.functions.invoke
 *
 * @param supabaseAdmin - Supabase client with service_role
 * @param functionName - Name of the edge function to call
 * @param body - Body to send to the function
 * @returns The data returned by the function
 * @throws Error if the function call fails
 */
export async function callEdgeFunction(
  supabaseAdmin: SupabaseClient,
  functionName: string,
  body: any
): Promise<any> {
  console.log(`Calling edge function: ${functionName}`, JSON.stringify(body));

  const { data, error } = await supabaseAdmin.functions.invoke(functionName, {
    body
  });

  if (error) {
    // Log full error object for debugging
    console.error(`Function ${functionName} failed with error:`, JSON.stringify(error, null, 2));

    // Extract error message - try to read from response body first
    let errorMessage = 'Unknown error';

    // Check if error has a context with a Response object (FunctionsHttpError)
    if (error.context && error.context instanceof Response) {
      try {
        const errorBody = await error.context.json();
        if (errorBody.error) {
          errorMessage = typeof errorBody.error === 'string' ? errorBody.error : JSON.stringify(errorBody.error);
        } else if (errorBody.message) {
          errorMessage = errorBody.message;
        } else {
          errorMessage = JSON.stringify(errorBody);
        }
      } catch (parseError) {
        // If we can't parse the response, try to get text
        try {
          const errorText = await error.context.text();
          errorMessage = errorText || error.message || 'Unknown error';
        } catch (textError) {
          // Fall back to error.message
          errorMessage = error.message || 'Unknown error';
        }
      }
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else if (error.message) {
      errorMessage = error.message;
    } else if (error.error) {
      errorMessage = typeof error.error === 'string' ? error.error : JSON.stringify(error.error);
    } else {
      errorMessage = JSON.stringify(error);
    }

    throw new Error(`Function ${functionName} failed: ${errorMessage}`);
  }

  console.log(`Function ${functionName} succeeded:`, JSON.stringify(data));
  return data;
}
