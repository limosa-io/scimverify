import { defineConfig } from 'vitepress'

// https://vitepress.vuejs.org/config/app-configs
export default defineConfig({
    lastUpdated: true,
    sitemap: {
        hostname: 'https://verify.scim.dev'
    },
    title: 'SCIM Verify',
    titleTemplate: 'verify.scim.dev',
    description: "Verify if your SCIM server meets the SCIM specification: a free CLI tool to verify SCIM server compliance",
    head: [
        [
            'meta',
            { property: 'og:image', content: '/scimverify-ogimage.png' }

        ],
        [
            'link',
            { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon.png' }
        ]
    ],
    themeConfig: {
        footer: {
            copyright: 'Copyright © 2023-present <a href="https://www.limosa.io">Limosa Digital Identity Solutions</a>'
        },
        nav: [
            { text: 'Home', link: '/' },
            { text: 'SCIM Playground', link: 'https://scim.dev', target: '_blank', rel: 'noopener' }
        ],
    },
    markdown: {

    }
})
