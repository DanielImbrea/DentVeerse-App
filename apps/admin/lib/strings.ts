/** Romanian UI copy for the admin panel (MVP default locale). */

export const s = {
  appName: 'DentalConnect',
  appSubtitle: 'Panou administrare',

  nav: {
    overview: 'Prezentare generală',
    users: 'Utilizatori',
    clinics: 'Clinici',
    laboratories: 'Laboratoare',
    posts: 'Postări',
    comments: 'Comentarii',
    reviews: 'Recenzii',
    reports: 'Raportări',
    verifications: 'Verificări',
    signOut: 'Deconectare',
  },

  login: {
    title: 'Bine ai venit',
    subtitle: 'Autentifică-te pentru a accesa panoul de administrare',
    email: 'Adresă email',
    password: 'Parolă',
    submit: 'Autentificare',
  },

  errors: {
    emailPasswordRequired: 'Emailul și parola sunt obligatorii.',
    signInFailed: 'Autentificarea a eșuat.',
    noAdminAccess: 'Acest cont nu are acces de administrator.',
    invalidCredentials: 'Date de autentificare invalide.',
    accessDenied: 'Acces refuzat',
    somethingWrong: 'Ceva nu a mers bine',
    noAdminAccessDetail: 'Nu ai acces de administrator sau sesiunea a expirat.',
    unexpected: 'A apărut o eroare neașteptată la încărcarea paginii.',
    goToLogin: 'Mergi la autentificare',
    loadDocument: 'Nu s-a putut încărca documentul.',
  },

  actions: {
    suspend: 'Suspendă',
    restore: 'Reactivează',
    hide: 'Ascunde',
    approve: 'Aprobă',
    reject: 'Respinge',
    action: 'Acționează',
    dismiss: 'Respinge raportul',
    viewDocument: 'Vezi documentul',
    loading: 'Se încarcă…',
  },

  tooltips: {
    suspendUser:
      'Blochează accesul utilizatorului la platformă. Nu poate intra în cont, trimite mesaje sau publica conținut până la reactivare.',
    restoreUser: 'Restabilește accesul utilizatorului. Poate folosi din nou platforma normal.',
    suspendClinic:
      'Ascunde clinica de pe hartă, din căutare și din feed. Proprietarul nu poate publica conținut nou până la reactivare.',
    restoreClinic: 'Reactivează clinica. Profilul devine din nou vizibil public.',
    suspendLab:
      'Ascunde laboratorul de pe hartă, din căutare și din feed. Proprietarul nu poate publica conținut nou până la reactivare.',
    restoreLab: 'Reactivează laboratorul. Profilul devine din nou vizibil public.',
    hidePost: 'Elimină postarea din feed-ul public. Rămâne în baza de date, dar nu mai este vizibilă utilizatorilor.',
    hideComment: 'Ascunde comentariul de sub postare. Nu mai este vizibil public.',
    hideReview: 'Ascunde recenzia de pe profilul clinicii. Nu mai influențează ratingul afișat.',
    reportAction:
      'Marchează raportarea ca rezolvată și ia măsuri (ex. ascunde conținutul sau suspendă contul din secțiunea corespunzătoare).',
    reportDismiss: 'Respinge raportarea ca nefondată. Nu se aplică nicio sancțiune.',
    approveVerification:
      'Aprobă cererea de verificare. Clinica/laboratorul primește badge-ul „Verificat” și devine mai vizibil în căutare.',
    rejectVerification:
      'Respinge cererea. Utilizatorul poate retrimite documente corecte din aplicație.',
    viewDocument: 'Deschide documentul încărcat pentru verificare (doar admin, link temporar securizat).',
  },

  overview: {
    title: 'Prezentare generală',
    description: 'Statistici live ale platformei',
    totalUsers: 'Utilizatori totali',
    patients: 'Pacienți',
    clinics: 'Clinici',
    laboratories: 'Laboratoare',
    pendingVerifications: 'Verificări în așteptare',
    openReports: 'Raportări deschise',
    monetizationNote:
      'Abonamente, plăți și KPI-uri de venit sunt amânate pentru faza de monetizare — la MVP totul este gratuit.',
  },

  users: {
    title: 'Utilizatori',
    description: 'Gestionează conturile platformei',
    searchPlaceholder: 'Caută după email sau telefon',
    email: 'Email',
    type: 'Tip cont',
    status: 'Status',
    created: 'Creat la',
  },

  clinics: {
    title: 'Clinici',
    description: 'Profiluri de clinici înregistrate',
    searchPlaceholder: 'Caută după nume',
    name: 'Nume',
    city: 'Oraș',
    verified: 'Verificat',
    rating: 'Rating',
    status: 'Status',
  },

  laboratories: {
    title: 'Laboratoare',
    description: 'Profiluri de laboratoare înregistrate',
    searchPlaceholder: 'Caută după nume',
    name: 'Nume',
    city: 'Oraș',
    zone: 'Zonă colaborare',
    verified: 'Verificat',
    status: 'Status',
  },

  posts: {
    title: 'Postări',
    description: 'Moderare conținut din feed',
  },

  comments: {
    title: 'Comentarii',
    description: 'Moderare comentarii',
  },

  reviews: {
    title: 'Recenzii',
    description: 'Moderare recenzii pacienți',
  },

  reports: {
    title: 'Raportări',
    description: 'Raportări deschise de utilizatori',
    empty: 'Nu există raportări deschise.',
  },

  verifications: {
    title: 'Verificări',
    description: 'Cereri de verificare clinică / laborator — documente încărcate de organizații',
    reviewNote: 'Notă de revizuire (opțional)',
    noDocuments: 'Niciun document încărcat',
    empty: 'Nu există verificări în așteptare.',
    submittedAt: 'Trimis la',
    orgDetails: 'Date organizație',
    documents: 'Documente încărcate',
    viewOrgInAdmin: 'Vezi în lista de organizații',
  },

  common: {
    yes: 'Da',
    no: 'Nu',
    empty: 'Nimic de afișat.',
  },
} as const;

const AUTH_ERROR_MAP: Record<string, string> = {
  'Invalid login credentials': s.errors.invalidCredentials,
  'Email and password are required': s.errors.emailPasswordRequired,
  'This account does not have admin access.': s.errors.noAdminAccess,
};

export function mapAuthError(message: string): string {
  return AUTH_ERROR_MAP[message] ?? message;
}

export function formatAccountType(type: string): string {
  const labels: Record<string, string> = {
    patient: 'Pacient',
    clinic: 'Clinică',
    laboratory: 'Laborator',
  };
  return labels[type] ?? type;
}

export function formatUserStatus(status: string): string {
  const labels: Record<string, string> = {
    active: 'Activ',
    suspended: 'Suspendat',
  };
  return labels[status] ?? status;
}

export function formatPostType(type: string): string {
  const labels: Record<string, string> = {
    text: 'Text',
    photo: 'Foto',
    video: 'Video',
    portfolio: 'Portofoliu',
    announcement: 'Anunț',
    collaboration: 'Colaborare',
  };
  return labels[type] ?? type;
}

export function formatPostStatus(status: string): string {
  const labels: Record<string, string> = {
    published: 'Publicat',
    removed: 'Ascuns',
    draft: 'Ciornă',
  };
  return labels[status] ?? status;
}

export function formatCommentStatus(status: string): string {
  const labels: Record<string, string> = {
    visible: 'Vizibil',
    removed: 'Ascuns',
  };
  return labels[status] ?? status;
}

export function formatReviewStatus(status: string): string {
  const labels: Record<string, string> = {
    visible: 'Vizibil',
    hidden_by_admin: 'Ascuns de admin',
  };
  return labels[status] ?? status;
}

export function formatVerificationStatus(status: string): string {
  const labels: Record<string, string> = {
    pending: 'În așteptare',
    approved: 'Aprobat',
    rejected: 'Respins',
  };
  return labels[status] ?? status;
}

export function formatVerificationDocumentType(type: string): string {
  const labels: Record<string, string> = {
    cui: 'Certificat CUI',
    dsp_authorization: 'Autorizație DSP',
    technician_certificate: 'Certificat tehnician responsabil',
    id_document: 'CI reprezentant legal',
    other: 'Alt document',
  };
  return labels[type] ?? type;
}

export function formatSubjectType(type: string): string {
  const labels: Record<string, string> = {
    clinic: 'Clinică',
    laboratory: 'Laborator',
  };
  return labels[type] ?? type;
}

export function formatReportReason(reason: string): string {
  const labels: Record<string, string> = {
    spam: 'Spam',
    harassment: 'Hărțuire',
    inappropriate: 'Conținut nepotrivit',
    fake: 'Profil fals',
    other: 'Altele',
  };
  return labels[reason] ?? reason;
}

export function getAdminReportPath(targetType: string, targetId: string | null): string | null {
  if (!targetId) return null;
  switch (targetType) {
    case 'post':
      return `/posts`;
    case 'comment':
      return `/comments`;
    case 'review':
      return `/reviews`;
    case 'user':
      return `/users`;
    case 'clinic':
      return `/clinics`;
    case 'laboratory':
      return `/laboratories`;
    default:
      return null;
  }
}

export function formatReportTarget(type: string): string {
  const labels: Record<string, string> = {
    user: 'Utilizator',
    clinic: 'Clinică',
    laboratory: 'Laborator',
    post: 'Postare',
    comment: 'Comentariu',
    review: 'Recenzie',
    message: 'Mesaj',
  };
  return labels[type] ?? type;
}

export function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('ro-RO');
}

export function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('ro-RO');
}
