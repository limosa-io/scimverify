import { defineConfig } from 'vitepress'

// https://vitepress.vuejs.org/config/app-configs
export default defineConfig({
    title: 'SCIM Verify',
    themeConfig: {
        nav: [
            { text: 'Home', link: '/' },
            { text: 'SCIM Playground', link: 'https://scim.dev', target: '_blank', rel: 'noopener' }
        ],
    },
    markdown: {
        
    }
})
