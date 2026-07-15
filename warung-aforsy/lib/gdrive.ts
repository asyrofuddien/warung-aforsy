export function toDirectImageUrl(url: string): string {
  if (!url) return '';

  // Google Drive shared link: https://drive.google.com/file/d/FILE_ID/view...
  const gdriveFileMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (gdriveFileMatch) {
    return `https://drive.google.com/uc?export=view&id=${gdriveFileMatch[1]}`;
  }

  // Google Drive open link: https://drive.google.com/open?id=FILE_ID
  const gdriveOpenMatch = url.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/);
  if (gdriveOpenMatch) {
    return `https://drive.google.com/uc?export=view&id=${gdriveOpenMatch[1]}`;
  }

  // Already a direct URL or other format — return as-is
  return url;
}
