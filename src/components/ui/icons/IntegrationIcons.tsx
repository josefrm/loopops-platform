import React from 'react';

interface IntegrationIconProps {
  type: string;
  className?: string;
}

export const IntegrationIcon: React.FC<IntegrationIconProps> = ({
  type,
  className = 'w-10 h-10',
}) => {
  const iconMap: Record<string, JSX.Element> = {
    Figma: (
      <svg
        className={className}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="40" height="40" rx="8" fill="#000000" />
        <path
          d="M16 10H20V16.67H16C14.16 16.67 12.67 15.18 12.67 13.33C12.67 11.49 14.16 10 16 10Z"
          fill="#FF7262"
        />
        <path
          d="M20 10H24C25.84 10 27.33 11.49 27.33 13.33C27.33 15.18 25.84 16.67 24 16.67H20V10Z"
          fill="#1ABCFE"
        />
        <path
          d="M20 16.67H24C25.84 16.67 27.33 18.16 27.33 20C27.33 21.84 25.84 23.33 24 23.33H20V16.67Z"
          fill="#0ACF83"
        />
        <path
          d="M12.67 26.67C12.67 24.83 14.16 23.34 16 23.34H20V26.67C20 28.51 18.51 30 16.67 30C14.83 30 12.67 28.51 12.67 26.67Z"
          fill="#A259FF"
        />
        <circle cx="23.33" cy="20" r="3.33" fill="#000000" />
      </svg>
    ),
    Jira: (
      <svg
        className={className}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="40" height="40" rx="8" fill="#0052CC" />
        <path
          d="M20 10L10 20L20 30L30 20L20 10ZM20 22.5L17.5 20L20 17.5L22.5 20L20 22.5Z"
          fill="white"
        />
      </svg>
    ),
    Git: (
      <svg
        className={className}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="40" height="40" rx="20" fill="#181717" />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M20 10C14.477 10 10 14.477 10 20C10 24.418 12.865 28.166 16.839 29.489C17.339 29.579 17.522 29.272 17.522 29.007C17.522 28.769 17.514 28.146 17.51 27.303C14.726 27.909 14.139 25.977 14.139 25.977C13.685 24.812 13.029 24.506 13.029 24.506C12.121 23.883 13.098 23.895 13.098 23.895C14.101 23.965 14.629 24.928 14.629 24.928C15.521 26.453 16.97 26.013 17.539 25.756C17.631 25.109 17.889 24.669 18.175 24.418C15.955 24.164 13.62 23.303 13.62 19.462C13.62 18.363 14.009 17.466 14.649 16.763C14.545 16.509 14.203 15.491 14.747 14.116C14.747 14.116 15.586 13.846 17.497 15.128C18.294 14.905 19.15 14.793 20.002 14.789C20.854 14.793 21.71 14.905 22.509 15.128C24.418 13.846 25.255 14.116 25.255 14.116C25.801 15.491 25.459 16.509 25.355 16.763C25.997 17.466 26.382 18.363 26.382 19.462C26.382 23.312 24.043 24.161 21.816 24.412C22.173 24.721 22.496 25.331 22.496 26.263C22.496 27.585 22.485 28.653 22.485 29.007C22.485 29.274 22.665 29.584 23.173 29.488C27.143 28.163 30 24.417 30 20C30 14.477 25.523 10 20 10Z"
          fill="white"
        />
      </svg>
    ),
    Gitlab: (
      <svg
        className={className}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="40" height="40" rx="8" fill="#FC6D26" />
        <path d="M20 30L25 15H15L20 30Z" fill="white" />
        <path d="M20 30L15 15H10L20 30Z" fill="#FCA326" />
        <path d="M10 15L8 21L20 30L10 15Z" fill="#FC6D26" />
        <path d="M10 15H15L12 10L10 15Z" fill="#E24329" />
        <path d="M20 30L25 15H30L20 30Z" fill="#FCA326" />
        <path d="M30 15L32 21L20 30L30 15Z" fill="#FC6D26" />
        <path d="M30 15H25L28 10L30 15Z" fill="#E24329" />
      </svg>
    ),
    Bucket: (
      <svg
        className={className}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="40" height="40" rx="8" fill="#0052CC" />
        <path
          d="M11.5 11.5L13 13L20 20L13 27L11.5 28.5L18.5 28.5L20 27L27 20L20 13L18.5 11.5H11.5Z"
          fill="white"
        />
        <path
          d="M20 20L27 13L28.5 11.5L28.5 18.5L27 20L20 27L20 20Z"
          fill="#2684FF"
        />
      </svg>
    ),
    Cursor: (
      <svg
        className={className}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="40" height="40" rx="8" fill="#000000" />
        <path
          d="M12 12L12 28L18 22L22 28L24 27L20 21L28 21L12 12Z"
          fill="white"
        />
      </svg>
    ),
    Visual: (
      <svg
        className={className}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="40" height="40" rx="8" fill="#007ACC" />
        <path d="M28 10L17 12V28L28 30V10Z" fill="white" />
        <path d="M17 12L10 15V25L17 28V12Z" fill="#CCCCCC" />
        <path d="M22 18L14 20V22L22 24V18Z" fill="#007ACC" />
      </svg>
    ),
    Repli: (
      <svg
        className={className}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="40" height="40" rx="8" fill="#F26207" />
        <circle cx="16" cy="16" r="3" fill="white" />
        <circle cx="24" cy="16" r="3" fill="white" />
        <circle cx="16" cy="24" r="3" fill="white" />
        <circle cx="24" cy="24" r="3" fill="white" />
      </svg>
    ),
    Google: (
      <svg
        className={className}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="40" height="40" rx="8" fill="white" />
        <path
          d="M30 20.23C30 19.47 29.94 18.94 29.82 18.39H20V21.77H25.62C25.5 22.77 24.86 24.27 23.39 25.27L23.37 25.42L26.58 27.91L26.8 27.93C28.84 26.09 30 23.43 30 20.23Z"
          fill="#4285F4"
        />
        <path
          d="M20 30.5C22.84 30.5 25.24 29.56 26.8 27.93L23.39 25.27C22.52 25.9 21.36 26.32 20 26.32C17.23 26.32 14.87 24.48 14.03 21.98L13.89 22L10.57 24.57L10.53 24.71C12.08 27.79 15.76 30.5 20 30.5Z"
          fill="#34A853"
        />
        <path
          d="M14.03 21.98C13.82 21.33 13.7 20.63 13.7 19.91C13.7 19.19 13.82 18.49 14.02 17.84L14.01 17.68L10.65 15.06L10.53 15.11C9.8 16.57 9.4 18.19 9.4 19.91C9.4 21.63 9.8 23.25 10.53 24.71L14.03 21.98Z"
          fill="#FBBC05"
        />
        <path
          d="M20 13.5C21.76 13.5 22.95 14.23 23.62 14.86L26.67 11.91C25.23 10.59 22.84 9.73 20 9.73C15.76 9.73 12.08 12.44 10.53 15.52L14.02 18.25C14.87 15.75 17.23 13.91 20 13.91V13.5Z"
          fill="#EB4335"
        />
      </svg>
    ),
    OneDrive: (
      <svg
        className={className}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="40" height="40" rx="8" fill="#0078D4" />
        <path
          d="M12 17C10.34 17 9 18.34 9 20C9 21.66 10.34 23 12 23H28C29.66 23 31 21.66 31 20C31 18.34 29.66 17 28 17H27C27 14.24 24.76 12 22 12C19.61 12 17.67 13.67 17.18 15.89C14.69 16.24 12.77 18.39 12.77 21H12V17Z"
          fill="white"
        />
      </svg>
    ),
    Notion: (
      <svg
        className={className}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="40" height="40" rx="8" fill="white" />
        <path d="M14 10L26 10L30 14V30L26 34H14L10 30V14L14 10Z" fill="black" />
        <path d="M15 14L17 12L23 12L25 14V26L23 28H17L15 26V14Z" fill="white" />
      </svg>
    ),
    Miro: (
      <svg
        className={className}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="40" height="40" rx="8" fill="#FFD02F" />
        <path d="M12 10L15 10L15 30L12 30L12 10Z" fill="#050038" />
        <path d="M17 12L20 12L20 30L17 30L17 12Z" fill="#050038" />
        <path d="M22 14L25 14L25 30L22 30L22 14Z" fill="#050038" />
        <path d="M27 16L30 16L30 30L27 30L27 16Z" fill="#050038" />
      </svg>
    ),
  };

  return iconMap[type] || iconMap.Figma;
};
