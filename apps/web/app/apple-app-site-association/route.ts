import { appleAppSiteAssociationResponse } from '../../lib/apple-app-site-association';

export const dynamic = 'force-static';

export async function GET() {
  return appleAppSiteAssociationResponse();
}
