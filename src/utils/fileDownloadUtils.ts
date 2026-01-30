export async function downloadFileFromUrl(
  url: string,
  fileName: string,
  mimeType?: string,
): Promise<File> {
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.statusText}`);
  }
  
  const blob = await response.blob();
  const fileType = mimeType || blob.type || 'application/octet-stream';
  
  return new File([blob], fileName, { type: fileType });
}

export function blobToFile(
  blob: Blob,
  fileName: string,
  mimeType?: string,
): File {
  const fileType = mimeType || blob.type || 'application/octet-stream';
  return new File([blob], fileName, { type: fileType });
}
