import type { SVGAttributes } from 'react';

export default function AppLogoIcon(props: SVGAttributes<SVGElement>) {
    return (
        <svg {...props} viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
            <rect x="1" y="1" width="38" height="38" rx="9" fill="#1151b4" />
            {/* Geometric م outline keeps the mark independent of host fonts. */}
            <path
                d="M30 17V33M30 17C30 10.9 25.5 7 19 7C12.5 7 8 11.4 8 17.5C8 24.1 12.8 29 19 29C24 29 28 26.4 30 22"
                fill="none"
                stroke="white"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="4.5"
            />
        </svg>
    );
}
