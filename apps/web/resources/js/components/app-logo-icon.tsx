import type { SVGAttributes } from 'react';

export default function AppLogoIcon(props: SVGAttributes<SVGElement>) {
    return (
        <svg {...props} viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
            <rect x="1" y="1" width="38" height="38" rx="9" fill="#1151b4" />
            {/* Traced from DejaVu Sans Bold U+0645; keep the counter hollow. */}
            <path
                d="M24.6 15.8Q25.3 15.4 25.3 14.8Q25.3 14 24.8 13.6Q24.6 13.4 24 13Q23.8 12.8 23 12.9Q22.4 12.9 22.1 13.3Q21.6 13.9 21.6 14.9Q21.6 15.4 21.7 15.9Q22.2 16.2 23.4 16.2Q24.1 16.2 24.6 15.8ZM16.7 19.8Q16.3 19.4 15.6 20.7Q15.3 21.3 15.3 22.4V32H8.4V22.4Q8.4 18.2 10.7 16.9Q13.6 15.2 15.3 15L15.3 14.6Q15.3 11.7 18.4 9.2Q19.8 8 22.9 8Q25.9 8 27.4 8.7Q31 10.3 31.4 13.5Q31.6 14.5 31.6 15.4Q31.6 18.1 29.7 19.4Q27.4 21.1 23.6 21.1Q18.3 21.1 16.7 19.8Z"
                fill="white"
                fillRule="evenodd"
            />
        </svg>
    );
}
