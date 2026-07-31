import type { SVGAttributes } from 'react';

export default function AppLogoIcon(props: SVGAttributes<SVGElement>) {
    return (
        <svg {...props} viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
            <rect x="1" y="1" width="38" height="38" rx="9" fill="#1151b4" />
            <text
                x="20"
                y="29"
                textAnchor="middle"
                fill="white"
                fontFamily="Arial, sans-serif"
                fontSize="25"
                fontWeight="700"
            >
                م
            </text>
        </svg>
    );
}
