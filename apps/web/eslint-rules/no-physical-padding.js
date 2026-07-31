const directionalUtilities = /(?:^|[\s:])(-?(?:pl|pr|ml|mr|left|right|text-left|text-right)-[^\s'"]+)/g;
const replacements = {
    pl: 'ps',
    pr: 'pe',
    ml: 'ms',
    mr: 'me',
    left: 'start',
    right: 'end',
    'text-left': 'text-start',
    'text-right': 'text-end',
};

function checkNode(context, node, value) {
    for (const match of value.matchAll(directionalUtilities)) {
        const utility = match[1];
        const unsignedUtility = utility.startsWith('-') ? utility.slice(1) : utility;
        const prefix = Object.keys(replacements).find((key) => unsignedUtility.startsWith(`${key}-`));
        const replacement = prefix ? `${utility.startsWith('-') ? '-' : ''}${replacements[prefix]}` : undefined;

        if (prefix && replacement) {
            context.report({
                node,
                message: `Use ${replacement}-${unsignedUtility.slice(prefix.length + 1)} instead of ${utility} for RTL support.`,
            });
        }
    }
}

export default {
    rules: {
        'no-physical-padding': {
            meta: {
                type: 'problem',
                docs: {
                    description: 'Disallow physical directional Tailwind utilities.',
                },
                schema: [],
            },
            create(context) {
                return {
                    Literal(node) {
                        if (typeof node.value === 'string') {
                            checkNode(context, node, node.value);
                        }
                    },
                    TemplateLiteral(node) {
                        for (const quasi of node.quasis) {
                            checkNode(context, quasi, quasi.value.raw);
                        }
                    },
                };
            },
        },
    },
};
