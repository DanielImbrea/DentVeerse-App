import { SITE } from './site';

/** Apple Universal Links — served at `/.well-known/apple-app-site-association` and `/apple-app-site-association`. */
export function buildAppleAppSiteAssociation(appleTeamId: string) {
  const teamId = appleTeamId.trim();
  if (!teamId || teamId === 'TEAMID') {
    return null;
  }
  return {
    applinks: {
      apps: [] as string[],
      details: [
        {
          appID: `${teamId}.${SITE.iosBundleId}`,
          paths: ['/auth/*', '/open/*'],
        },
      ],
    },
  };
}

/** Android App Links — `/.well-known/assetlinks.json`. */
export function buildAndroidAssetLinks(sha256Fingerprints: string[]) {
  const prints = sha256Fingerprints.map((s) => s.trim()).filter(Boolean);
  if (prints.length === 0 || prints.some((p) => p.includes('REPLACE'))) {
    return null;
  }
  return [
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: SITE.androidPackage,
        sha256_cert_fingerprints: prints,
      },
    },
  ];
}
