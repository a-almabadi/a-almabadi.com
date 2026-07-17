/**
 * blog.js
 * -----------------------------------------------------------------------------
 * Full blog logic (Knowledge Hub):
 *   - blogPosts array with taxonomy (categories/keywords)
 *   - articleDetails (visual metadata + intro/caption/introAr + markdown IDs)
 *   - Filtering, search, and pagination
 *   - renderBlogPosts / renderBlogDropdown / filterBlog / filterBlogCategory
 *   - openLatestArticles / openBlogArchive / changeBlogPage
 *   - Article reader modal (showBlogModal / populateBlogModal / closeBlogModal)
 *   - Reading progress bar
 *   - Table of contents with sticky + mobile toggle + scroll spy
 *   - Custom markdown renderer (headings/code/lists/images/videos/tables/journey)
 *   - code-block copy and share-link support
 *   - Related articles
 *   - Giscus comments
 *   - Internet Journey flow with drag and arrow support
 *
 * Exported API:
 *   - init()
 *   - All functions required by HTML onclick handlers
 * -----------------------------------------------------------------------------
 */

import { prefersReducedMotion } from './animations.js';

/* ==================================================================
 * Blog constants and state
 * ================================================================== */

const BLOG_PAGE_SIZE = 8;
const blogFilters = { year: 'all', category: 'all', query: '', mode: 'all', page: 1 };

let blogModalTimeline = null;
let blogPaginationAnimating = false;
let articleTocHeadings = [];
let articleTocActiveIndex = -1;
let activeBlogPost = null;
let lastArticleFocus = null;
let blogSearchInput = null;
let blogArticleScrollListenerBound = false;
let blogOutsideClickListenerBound = false;
let blogEscapeListenerBound = false;

const GISCUS_CONFIG = {
    repo: 'a-almabadi/Comments',
    repoId: 'R_kgDOTXUWNA',
    category: 'Comments',
    categoryId: 'DIC_kwDOTXUWNM4DBHs_'
};

/* ==================================================================
 * Article data
 * ================================================================== */

const blogPosts = [
    {"id":15,"year":"2024","date":"June 20, 2024","dateAr":"٢٠ يونيو ٢٠٢٤","tag":"#Networking","title":"Networking Basics - For Beginners","titleAr":"أساسيات الشبكات - للمبتدئين","excerpt":"In this article, I'll explain the basics of networking in a simple way, hoping it will be a reference for me and you, whether you're just starting out or want to review the concepts.","excerptAr":"في هذا المقال، سأشرح لكم أساسيات الشبكات بطريقة مبسطة، وإن شاء الله يكون مرجع لي ولكم، سواء كنت توك تبدأ أو تبي تراجع المفاهيم.","readTime":"4 min","readTimeAr":"٤ دقائق","content":"In this article, I'll explain the basics of networking in a simple way, hoping it will be a reference for me and you, whether you're just starting out or want to review the concepts.","contentAr":"في هذا المقال، سأشرح لكم أساسيات الشبكات بطريقة مبسطة، وإن شاء الله يكون مرجع لي ولكم، سواء كنت توك تبدأ أو تبي تراجع المفاهيم."},
    {"id":16,"year":"2021","date":"August 15, 2021","dateAr":"١٥ أغسطس ٢٠٢١","tag":"#Security","title":"Security Commands in Linux","titleAr":"أوامر الأمان في لينكس — Security Commands in Linux","excerpt":"A clear guide to essential commands that help keep your system secure. Learn about ss, who, last, passwd, and ufw commands for monitoring and maintaining Linux system security.","excerptAr":"مرجع شامل لأهم أوامر حماية النظام. تعلم أوامر ss و who و last و passwd و ufw لمراقبة وصيانة أمان نظام لينكس.","readTime":"2 min","readTimeAr":"٢ دقائق","content":"A clear guide to essential commands that help keep your system secure. Learn about ss, who, last, passwd, and ufw commands for monitoring and maintaining Linux system security.","contentAr":"مرجع شامل لأهم أوامر حماية النظام. تعلم أوامر ss و who و last و passwd و ufw لمراقبة وصيانة أمان نظام لينكس."},
    {"id":17,"year":"2021","date":"June 10, 2021","dateAr":"١٠ يونيو ٢٠٢١","tag":"#Linux","title":"System Monitoring Commands in Linux","titleAr":"أوامر مراقبة النظام في لينكس","excerpt":"Learn essential Linux system monitoring commands including uptime, free, ps, tcpdump, w, htop, iostat, lsof, pidstat, and top to monitor CPU, memory, disk activity, processes, and network traffic.","excerptAr":"مقال هذا الأسبوع عن أهم الأوامر التي تساعدك على مراقبة النظام في لينكس. تعلم أوامر uptime و free و ps و tcpdump و w و htop و iostat و lsof و pidstat و top لمراقبة المعالج والذاكرة والأقراص والعمليات وحركة الشبكة.","readTime":"2 min","readTimeAr":"٢ دقائق","content":"Learn essential Linux system monitoring commands including uptime, free, ps, tcpdump, w, htop, iostat, lsof, pidstat, and top to monitor CPU, memory, disk activity, processes, and network traffic.","contentAr":"مقال هذا الأسبوع عن أهم الأوامر التي تساعدك على مراقبة النظام في لينكس. تعلم أوامر uptime و free و ps و tcpdump و w و htop و iostat و lsof و pidstat و top لمراقبة المعالج والذاكرة والأقراص والعمليات وحركة الشبكة."},
    {"id":18,"year":"2023","date":"November 19, 2023","dateAr":"١٩ نوفمبر ٢٠٢٣","tag":"#Linux","title":"User Account Management in Linux — Commands You Can Use to Manage Users","titleAr":"إدارة حسابات المستخدمين في لينكس — أوامر لإدارة المستخدمين","excerpt":"Learn essential Linux user management commands including who, finger, useradd, passwd, usermod, and chfn to effectively manage user accounts on your system.","excerptAr":"تعلم أهم أوامر إدارة حسابات المستخدمين في لينكس التي نستخدمها بشكل يومي، بما في ذلك who و finger و useradd و passwd و usermod و chfn.","readTime":"1 min","readTimeAr":"١ دقائق","content":"Learn essential Linux user management commands including who, finger, useradd, passwd, usermod, and chfn to effectively manage user accounts on your system.","contentAr":"تعلم أهم أوامر إدارة حسابات المستخدمين في لينكس التي نستخدمها بشكل يومي، بما في ذلك who و finger و useradd و passwd و usermod و chfn."},
    {"id":19,"year":"2025","date":"August 20, 2025","dateAr":"٢٠ أغسطس ٢٠٢٥","tag":"#Networking","title":"Networking Basics: A Simple Guide to ACLs","titleAr":"أساسيات الشبكات: شرح مبسط لقوائم التحكم ACL","excerpt":"Access Control Lists (ACLs) are one of the most important tools in networking for controlling traffic and securing networks. In this article, we'll provide a clear and simple explanation of what ACLs are, why they matter, and how they are used.","excerptAr":"في هذا المقال سنتحدث عن قوائم التحكم في الوصول (Access Control List - ACL)، وما هي فائدتها في تأمين الشبكات وتنظيم حركة البيانات داخل أجهزة الشبكة مثل الراوتر والسويتش.","readTime":"4 min","readTimeAr":"٤ دقائق","content":"Access Control Lists (ACLs) are one of the most important tools in networking for controlling traffic and securing networks. In this article, we'll provide a clear and simple explanation of what ACLs are, why they matter, and how they are used.","contentAr":"في هذا المقال سنتحدث عن قوائم التحكم في الوصول (Access Control List - ACL)، وما هي فائدتها في تأمين الشبكات وتنظيم حركة البيانات داخل أجهزة الشبكة مثل الراوتر والسويتش."},
    {"id":20,"year":"2025","date":"June 21, 2025","dateAr":"٢١ يونيو ٢٠٢٥","tag":"#Networking","title":"Networking Basics: A Detailed Guide to VLANs","titleAr":"أساسيات الشبكات: شرح موسّع للشبكات الافتراضية VLAN","excerpt":"VLANs (Virtual Local Area Networks) are one of the most important and powerful networking technologies. Without them, building an organized, secure, and scalable network would be very difficult.","excerptAr":"تعتبر الـ VLAN (Virtual Local Area Network) من أهم وأقوى تقنيات الشبكات. بدونها، يصبح بناء شبكة منظمة، آمنة، وقابلة للتوسع صعب جداً.","readTime":"6 min","readTimeAr":"٦ دقائق","content":"VLANs (Virtual Local Area Networks) are one of the most important and powerful networking technologies. Without them, building an organized, secure, and scalable network would be very difficult.","contentAr":"تعتبر الـ VLAN (Virtual Local Area Network) من أهم وأقوى تقنيات الشبكات. بدونها، يصبح بناء شبكة منظمة، آمنة، وقابلة للتوسع صعب جداً."},
    {"id":21,"year":"2025","date":"June 19, 2025","dateAr":"١٩ يونيو ٢٠٢٥","tag":"#Security","title":"Why You Should Use a VPN","titleAr":"لماذا يجب أن تستخدم شبكة افتراضية خاصة (VPN)؟","excerpt":"Almost everyone has heard of a VPN (Virtual Private Network), but many people still don't know the full range of benefits this technology provides. With popular services like NordVPN, ExpressVPN, ProtonVPN, and Tailscale becoming widespread, using a VPN has become essential for anyone who uses the internet daily.","excerptAr":"تقريبًا كل شخص فينا سمع عن الـ VPN (الشبكة الافتراضية الخاصة)، لكن كثير ما يعرفون كل الفوائد الحقيقية والاستخدامات المتعددة لها التقنية المهمة. مع انتشار خدمات كبيرة مثل NordVPN، ExpressVPN، ProtonVPN، وTailscale، صار الـ VPN أداة أساسية لأي واحد يتعامل مع الإنترنت يوميًا.","readTime":"4 min","readTimeAr":"٤ دقائق","content":"Almost everyone has heard of a VPN (Virtual Private Network), but many people still don't know the full range of benefits this technology provides. With popular services like NordVPN, ExpressVPN, ProtonVPN, and Tailscale becoming widespread, using a VPN has become essential for anyone who uses the internet daily.","contentAr":"تقريبًا كل شخص فينا سمع عن الـ VPN (الشبكة الافتراضية الخاصة)، لكن كثير ما يعرفون كل الفوائد الحقيقية والاستخدامات المتعددة لها التقنية المهمة. مع انتشار خدمات كبيرة مثل NordVPN، ExpressVPN، ProtonVPN، وTailscale، صار الـ VPN أداة أساسية لأي واحد يتعامل مع الإنترنت يوميًا."},
    {"id":22,"year":"2026","date":"July 14, 2026","dateAr":"١٤ يوليو ٢٠٢٦","tag":"#Fiber","title":"The Internet Journey: From Undersea Cables to the Server","titleAr":"رحلة الإنترنت: كيف يوصل النت من تحت البحر إلى السيرفر؟","excerpt":"Follow the path of internet traffic from submarine fiber-optic cables and cable landing stations to the MMR, ODF, cross-connects, data center network, racks, and servers.","excerptAr":"تعرّف على رحلة الإنترنت من كابلات الألياف البحرية ومحطات الإنزال إلى غرفة MMR وODF والربط المتقاطع وشبكة مركز البيانات، وصولًا إلى الرفوف والسيرفرات.","readTime":"4 min","readTimeAr":"٤ دقائق","content":"A practical look at the physical journey internet traffic takes from submarine cables to the server delivering a website or application.","contentAr":"شرح عملي للرحلة المادية التي يقطعها اتصال الإنترنت من الكابل البحري حتى السيرفر الذي يقدم الموقع أو التطبيق."}
];

const articleTaxonomy = {
    "15":{"category":"Networking","categoryAr":"الشبكات","keywords":["networking","technology","beginners","basics","networking basics"],"keywordsAr":["الشبكات","شبكات","تقنية","مبتدئين","أساسيات الشبكات - للمبتدئين"]},
    "16":{"category":"Cybersecurity","categoryAr":"الأمن السيبراني","keywords":["cybersecurity","linux","security","system administration","commands","linux security commands"],"keywordsAr":["الأمن السيبراني","linux","أمان","إدارة الأنظمة","أوامر","أوامر الأمان في لينكس — Security Commands in Linux"]},
    "17":{"category":"Infrastructure","categoryAr":"البنية التحتية","keywords":["infrastructure","linux","system monitoring","commands","performance","linux system monitoring"],"keywordsAr":["البنية التحتية","linux","مراقبة النظام","أوامر","الأداء","أوامر مراقبة النظام في لينكس"]},
    "18":{"category":"Infrastructure","categoryAr":"البنية التحتية","keywords":["infrastructure","linux","system administration","commands","user management","linux user management"],"keywordsAr":["البنية التحتية","linux","إدارة الأنظمة","أوامر","إدارة المستخدمين","إدارة حسابات المستخدمين في لينكس — أوامر لإدارة المستخدمين"]},
    "19":{"category":"Networking","categoryAr":"الشبكات","keywords":["networking","ACLs","security","routing","Cisco","networking basics acls"],"keywordsAr":["الشبكات","شبكات","ACLs","أمان","راو팅","Cisco","أساسيات الشبكات: شرح مبسط لقوائم التحكم ACL"]},
    "20":{"category":"Networking","categoryAr":"الشبكات","keywords":["networking","VLANs","switching","Cisco","network security","networking basics vlans"],"keywordsAr":["الشبكات","شبكات","VLANs","سويتشات","Cisco","أمان الشبكات","أساسيات الشبكات: شرح موسّع للشبكات الافتراضية VLAN"]},
    "21":{"category":"Cybersecurity","categoryAr":"الأمن السيبراني","keywords":["cybersecurity","vpn","security","privacy","networking","why you should use vpn"],"keywordsAr":["الأمن السيبراني","VPN","أمان","خصوصية","شبكات","لماذا يجب أن تستخدم شبكة افتراضية خاصة (VPN)؟"]},
    "22":{"category":"Telecommunications","categoryAr":"الاتصالات","keywords":["submarine cables","fiber optic","cable landing station","MMR","ODF","cross connect","MDA","POD","data center","server"],"keywordsAr":["الكابلات البحرية","الألياف الضوئية","محطة إنزال الكابل","غرفة الربط","ODF","الربط المتقاطع","مركز البيانات","السيرفر"]}
};

blogPosts.forEach(post => Object.assign(post, articleTaxonomy[post.id] || {}));

const articleDetails = {
    "15":{"visual":"routing","intro":"In this article, I'll explain the basics of networking in a simple way, hoping it will be a reference for me and you, whether you're just starting out or want to review the concepts.","introAr":"في هذا المقال، سأشرح لكم أساسيات الشبكات بطريقة مبسطة، وإن شاء الله يكون مرجع لي ولكم، سواء كنت توك تبدأ أو تبي تراجع المفاهيم.","caption":"Networking fundamentals — devices, network types, OSI layers, and IP addressing.","captionAr":"أساسيات الشبكات — الأجهزة والأنواع وطبقات OSI وعناوين IP.","hideMedia":true,"markdownIdEN":"article-15-en-markdown","markdownIdAR":"article-15-ar-markdown"},
    "16":{"visual":"security","intro":"A clear guide to essential commands that help keep your system secure. Learn about ss, who, last, passwd, and ufw commands for monitoring and maintaining Linux system security.","introAr":"مرجع شامل لأهم أوامر حماية النظام. تعلم أوامر ss و who و last و passwd و ufw لمراقبة وصيانة أمان نظام لينكس.","caption":"Linux security toolkit — sessions, connections, passwords, and firewall controls.","captionAr":"أدوات أمان لينكس — الجلسات والاتصالات وكلمات المرور والجدار الناري.","hideMedia":true,"markdownIdEN":"article-16-en-markdown","markdownIdAR":"article-16-ar-markdown"},
    "17":{"visual":"observability","intro":"Learn essential Linux system monitoring commands including uptime, free, ps, tcpdump, w, htop, iostat, lsof, pidstat, and top to monitor CPU, memory, disk activity, processes, and network traffic.","introAr":"مقال هذا الأسبوع عن أهم الأوامر التي تساعدك على مراقبة النظام في لينكس. تعلم أوامر uptime و free و ps و tcpdump و w و htop و iostat و lsof و pidstat و top لمراقبة المعالج والذاكرة والأقراص والعمليات وحركة الشبكة.","caption":"Linux observability — processes, resources, services, storage, and system health.","captionAr":"مراقبة لينكس — العمليات والموارد والخدمات والتخزين وصحة النظام.","hideMedia":true,"markdownIdEN":"article-17-en-markdown","markdownIdAR":"article-17-ar-markdown"},
    "18":{"visual":"automation","intro":"Learn essential Linux user management commands including who, finger, useradd, passwd, usermod, and chfn to effectively manage user accounts on your system.","introAr":"تعلم أهم أوامر إدارة حسابات المستخدمين في لينكس التي نستخدمها بشكل يومي، بما في ذلك who و finger و useradd و passwd و usermod و chfn.","caption":"Linux identity administration — users, groups, permissions, and account lifecycle.","captionAr":"إدارة الهوية في لينكس — المستخدمون والمجموعات والصلاحيات ودورة حياة الحساب.","hideMedia":true,"markdownIdEN":"article-18-en-markdown","markdownIdAR":"article-18-ar-markdown"},
    "19":{"visual":"security","intro":"Access Control Lists (ACLs) are one of the most important tools in networking for controlling traffic and securing networks. In this article, we'll provide a clear and simple explanation of what ACLs are, why they matter, and how they are used.","introAr":"في هذا المقال سنتحدث عن قوائم التحكم في الوصول (Access Control List - ACL)، وما هي فائدتها في تأمين الشبكات وتنظيم حركة البيانات داخل أجهزة الشبكة مثل الراوتر والسويتش.","caption":"ACL policy flow — traffic matching, permit and deny logic, and safe deployment.","captionAr":"تدفق سياسات ACL — مطابقة الحركة ومنطق السماح والمنع والنشر الآمن.","image":{"src":"https://i.postimg.cc/NfxtsRWj/Screenshot-20260717-010108-Linked-In.jpg","alt":"Networking Basics: A Simple Guide to ACLs","altAr":"أساسيات الشبكات: شرح مبسط لقوائم التحكم ACL","caption":"ACL policy flow — traffic matching, permit and deny logic, and safe deployment.","captionAr":"تدفق سياسات ACL — مطابقة الحركة ومنطق السماح والمنع والنشر الآمن."},"markdownIdEN":"article-19-en-markdown","markdownIdAR":"article-19-ar-markdown"},
    "20":{"visual":"routing","intro":"VLANs (Virtual Local Area Networks) are one of the most important and powerful networking technologies. Without them, building an organized, secure, and scalable network would be very difficult.","introAr":"تعتبر الـ VLAN (Virtual Local Area Network) من أهم وأقوى تقنيات الشبكات. بدونها، يصبح بناء شبكة منظمة، آمنة، وقابلة للتوسع صعب جداً.","caption":"VLAN architecture — segmentation, trunks, access ports, and inter-VLAN routing.","captionAr":"هندسة VLAN — التقسيم والروابط الجذعية ومنافذ الوصول والتوجيه بين الشبكات.","hideMedia":true,"markdownIdEN":"article-20-en-markdown","markdownIdAR":"article-20-ar-markdown"},
    "21":{"visual":"zero-trust","intro":"Almost everyone has heard of a VPN (Virtual Private Network), but many people still don't know the full range of benefits this technology provides. With popular services like NordVPN, ExpressVPN, ProtonVPN, and Tailscale becoming widespread, using a VPN has become essential for anyone who uses the internet daily.","introAr":"تقريبًا كل شخص فينا سمع عن الـ VPN (الشبكة الافتراضية الخاصة)، لكن كثير ما يعرفون كل الفوائد الحقيقية والاستخدامات المتعددة لها التقنية المهمة. مع انتشار خدمات كبيرة مثل NordVPN، ExpressVPN، ProtonVPN، وTailscale، صار الـ VPN أداة أساسية لأي واحد يتعامل مع الإنترنت يوميًا.","caption":"VPN protection model — encrypted tunnels, privacy, remote access, and safe usage.","captionAr":"نموذج حماية VPN — الأنفاق المشفرة والخصوصية والوصول البعيد والاستخدام الآمن.","image":{"src":"https://i.postimg.cc/3wytPPrB/1.jpg","alt":"Why You Should Use a VPN","altAr":"لماذا يجب أن تستخدم شبكة افتراضية خاصة (VPN)؟","caption":"VPN protection model — encrypted tunnels, privacy, remote access, and safe usage.","captionAr":"نموذج حماية VPN — الأنفاق المشفرة والخصوصية والوصول البعيد والاستخدام الآمن."},"markdownIdEN":"article-21-en-markdown","markdownIdAR":"article-21-ar-markdown"},
    "22":{"visual":"fiber","intro":"A practical look at how internet traffic travels from submarine fiber-optic cables to landing stations, data center interconnection rooms, distribution frames, racks, and finally the server.","introAr":"نظرة عملية على رحلة الإنترنت من كابلات الألياف البحرية إلى محطات الإنزال وغرف الربط وإطارات توزيع الألياف والرفوف، وصولًا إلى السيرفر.","caption":"End-to-end internet path — submarine cable, landing station, terrestrial fiber, data center interconnection, and server.","captionAr":"مسار الإنترنت من البداية إلى النهاية — الكابل البحري ومحطة الإنزال والفايبر الأرضي وربط مركز البيانات والسيرفر.","image":{"src":"https://i.postimg.cc/FR6BXfry/original-757ee28a2cb3cefb46bafd4756d4084e.png","alt":"A modern data center server aisle","altAr":"ممر خوادم داخل مركز بيانات حديث","caption":"The final destination of the internet journey — the data center infrastructure hosting applications and services.","captionAr":"الوجهة النهائية في رحلة الإنترنت — البنية التحتية لمركز البيانات التي تستضيف التطبيقات والخدمات."},"markdownIdEN":"article-22-en-markdown","markdownIdAR":"article-22-ar-markdown"}
};

/* ==================================================================
 * Helper functions
 * ================================================================== */

function getCurrentLang() {
    if (typeof window !== 'undefined' && typeof window.currentLang === 'string') {
        return window.currentLang === 'ar' ? 'ar' : 'en';
    }
    return document.documentElement.getAttribute('lang') === 'ar' ? 'ar' : 'en';
}

/**
 * Bilingual string lookup: prefer the i18n dictionaries (locales/*.json via
 * window.t), falling back to the inline pair when the runtime is unavailable.
 */
function tr(key, fallbackEn, fallbackAr) {
    if (typeof window.t === 'function') {
        const value = window.t(key);
        if (value && value !== key) return value;
    }
    return getCurrentLang() === 'ar' ? fallbackAr : fallbackEn;
}

function getMostRecentBlogYear() {
    return String(Math.max(...blogPosts.map(post => Number(post.year)).filter(Number.isFinite)));
}

function normalizeArticleSearch(value = '') {
    return value
        .normalize('NFKD')
        .replace(/[\u064B-\u065F\u0670]/g, '')
        .replace(/ـ/g, '')
        .toLowerCase()
        .trim();
}

function articleMatchesSearch(post, query) {
    if (!query) return true;
    const details = articleDetails[post.id];
    const detailTerms = details?.sections
        ? details.sections.flatMap(section => [section.title, section.titleAr, ...(section.bullets || []), ...(section.bulletsAr || [])])
        : details ? [getArticleMarkdownSource(details, 'en'), getArticleMarkdownSource(details, 'ar')] : [];
    const searchable = [
        post.title, post.titleAr, post.excerpt, post.excerptAr,
        post.category, post.categoryAr, post.tag,
        ...(post.keywords || []), ...(post.keywordsAr || []),
        ...detailTerms
    ].filter(Boolean).join(' ');
    const haystack = normalizeArticleSearch(searchable);
    return normalizeArticleSearch(query).split(/\s+/).every(term => haystack.includes(term));
}

function escapeArticleText(value = '') {
    return value.replace(/[&<>"']/g, character => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    })[character]);
}

function getArticleSlug(post) {
    if (post.slug) return post.slug;
    return post.title
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || `article-${post.id}`;
}

/* ==================================================================
 * Initial rendering (dropdown counts / mode presentation)
 * ================================================================== */

function renderBlogDropdown() {
    const latestYear = getMostRecentBlogYear();
    const latestCount = Math.min(7, blogPosts.filter(post => post.year === latestYear).length);
    const archiveCount = blogPosts.length;
    const formatCount = value => getCurrentLang() === 'ar'
        ? new Intl.NumberFormat('ar-SA', { minimumIntegerDigits: 2, useGrouping: false }).format(value)
        : String(value).padStart(2, '0');
    document.querySelectorAll('.blog-choice-count--latest').forEach(element => {
        element.textContent = formatCount(latestCount);
    });
    document.querySelectorAll('.blog-choice-count--archive').forEach(element => {
        element.textContent = formatCount(archiveCount);
    });
    // Populate the latest-articles list in the dropdown (if containers exist)
    const latestContainer = document.getElementById('blog-menu-latest');
    if (latestContainer) {
        const latest = blogPosts
            .slice()
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 6);
        const isAr = getCurrentLang() === 'ar';
        latestContainer.innerHTML = latest.map(post => `
            <button type="button" class="blog-menu-article" onclick="openBlogArticleById(${post.id}, this)">
                <div>
                    <div class="blog-menu-article__meta">
                        <span class="blog-menu-article__category">${isAr ? (post.categoryAr || post.category) : (post.category || post.categoryAr)}</span>
                        <span>·</span>
                        <span>${isAr ? post.dateAr : post.date}</span>
                    </div>
                    <div class="blog-menu-article__title">${escapeArticleText(isAr ? post.titleAr : post.title)}</div>
                    <div class="blog-menu-article__preview">${escapeArticleText(isAr ? post.excerptAr : post.excerpt)}</div>
                </div>
                <i class="fa-solid fa-chevron-${isAr ? 'left' : 'right'}" aria-hidden="true"></i>
            </button>
        `).join('');
    }
}

function updateBlogModePresentation() {
    const layout = document.getElementById('blog-results-layout');
    const archiveNavigation = document.getElementById('blog-archive-navigation');
    const eyebrow = document.getElementById('blog-view-eyebrow');
    const title = document.getElementById('blog-view-title');
    const description = document.getElementById('blog-view-description');
    const isLatest = blogFilters.mode === 'latest';

    layout?.classList.toggle('is-latest-view', isLatest);
    if (archiveNavigation) archiveNavigation.setAttribute('aria-hidden', String(isLatest));

    if (isLatest) {
        if (eyebrow) eyebrow.textContent = tr('blog.recentlyPublished', 'Recently Published', 'أحدث المنشورات');
        if (title) title.textContent = tr('blog.latestArticles', 'Latest Articles', 'أحدث المقالات');
        if (description) description.textContent = tr('blog.latestDescription',
            "Read the latest articles, updates, and practical insights. Discover what's new and stay up to date with recently published content.",
            'اقرأ أحدث المقالات والتحديثات والرؤى العملية. اكتشف كل جديد وابقَ على اطلاع بأحدث المحتوى المنشور.');
    } else {
        if (eyebrow) eyebrow.textContent = tr('blog.completeCollection', 'Complete Collection', 'المجموعة الكاملة');
        if (title) title.textContent = tr('blog.articlesArchive', 'Articles Archive', 'أرشيف المقالات');
        if (description) description.textContent = tr('blog.archiveDescription',
            "Browse the complete archive of all published articles and technical notes. Explore everything we've shared in one place.",
            'تصفح الأرشيف الكامل لجميع المقالات والملاحظات التقنية المنشورة. استكشف كل ما شاركناه في مكان واحد.');
    }
}

function updateArchiveCounts() {
    const counts = blogPosts.reduce((result, post) => {
        result.all += 1;
        result[post.year] = (result[post.year] || 0) + 1;
        return result;
    }, { all: 0 });
    ['all', '2026', '2025', '2024', '2023', '2021'].forEach(key => {
        const element = document.getElementById(`archive-count-${key}`);
        if (element) element.textContent = counts[key] || 0;
    });
}

function updateKnowledgeResultCount(count) {
    const element = document.getElementById('knowledge-result-count');
    if (!element) return;
    const noun = count === 1
        ? tr('blog.count.article', 'article', 'مقال')
        : tr('blog.count.articles', 'articles', 'مقالاً');
    const number = getCurrentLang() === 'ar' ? new Intl.NumberFormat('ar-SA').format(count) : String(count);
    element.textContent = `${number} ${noun}`;
}

function updateBlogPagination(totalItems, totalPages) {
    const pagination = document.getElementById('blog-pagination');
    const previous = document.getElementById('blog-page-prev');
    const next = document.getElementById('blog-page-next');
    const pageLabel = document.getElementById('blog-pagination-page');
    const rangeLabel = document.getElementById('blog-pagination-range');
    if (!pagination || !previous || !next || !pageLabel || !rangeLabel) return;

    const showPagination = blogFilters.mode === 'all' && totalItems > BLOG_PAGE_SIZE;
    pagination.hidden = !showPagination;
    if (!showPagination) return;

    const formatNumber = value => getCurrentLang() === 'ar'
        ? new Intl.NumberFormat('ar-SA').format(value)
        : String(value);
    const firstArticle = (blogFilters.page - 1) * BLOG_PAGE_SIZE + 1;
    const lastArticle = Math.min(blogFilters.page * BLOG_PAGE_SIZE, totalItems);
    pageLabel.textContent = getCurrentLang() === 'ar'
        ? `الصفحة ${formatNumber(blogFilters.page)} من ${formatNumber(totalPages)}`
        : `Page ${formatNumber(blogFilters.page)} of ${formatNumber(totalPages)}`;
    rangeLabel.textContent = getCurrentLang() === 'ar'
        ? `${formatNumber(firstArticle)}–${formatNumber(lastArticle)} من ${formatNumber(totalItems)} مقالاً`
        : `${formatNumber(firstArticle)}–${formatNumber(lastArticle)} of ${formatNumber(totalItems)} articles`;

    previous.disabled = blogFilters.page <= 1;
    next.disabled = blogFilters.page >= totalPages;
    previous.setAttribute('aria-label', tr('blog.pagination.previous', 'Previous page', 'الصفحة السابقة'));
    next.setAttribute('aria-label', tr('blog.pagination.next', 'Next page', 'الصفحة التالية'));
    previous.title = tr('blog.pagination.previous', 'Previous page', 'الصفحة السابقة');
    next.title = tr('blog.pagination.next', 'Next page', 'الصفحة التالية');
}

function scrollBlogFeedIntoView() {
    const page = document.getElementById('page-blog');
    const feed = document.getElementById('blog-feed');
    if (!page || !feed) return;
    const top = Math.max(0, feed.offsetTop - 112);
    page.scrollTo({ top, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
}

/* ==================================================================
 * Card rendering, filtering, and pagination
 * ================================================================== */

function renderBlogPageWithTransition(nextPage) {
    const feed = document.getElementById('blog-feed');
    if (!feed || !window.gsap || prefersReducedMotion()) {
        blogFilters.page = nextPage;
        renderBlogPosts();
        scrollBlogFeedIntoView();
        return;
    }
    if (blogPaginationAnimating) return;
    blogPaginationAnimating = true;
    const currentCards = [...feed.querySelectorAll('.blog-card')];
    window.gsap.to(currentCards, {
        autoAlpha: 0,
        y: -10,
        duration: 0.2,
        stagger: 0.012,
        ease: 'power1.in',
        onComplete: () => {
            blogFilters.page = nextPage;
            renderBlogPosts();
            scrollBlogFeedIntoView();
            const nextCards = [...feed.querySelectorAll('.blog-card')];
            window.gsap.fromTo(nextCards,
                { autoAlpha: 0, y: 16 },
                {
                    autoAlpha: 1,
                    y: 0,
                    duration: 0.44,
                    stagger: 0.045,
                    ease: 'power2.out',
                    clearProps: 'transform',
                    onComplete: () => { blogPaginationAnimating = false; }
                }
            );
            if (!nextCards.length) blogPaginationAnimating = false;
        }
    });
    if (!currentCards.length) {
        blogPaginationAnimating = false;
        blogFilters.page = nextPage;
        renderBlogPosts();
    }
}

function changeBlogPage(direction) {
    if (blogFilters.mode !== 'all' || blogPaginationAnimating) return;
    const totalItems = blogPosts
        .filter(post => blogFilters.year === 'all' || post.year === blogFilters.year)
        .filter(post => blogFilters.category === 'all' || post.category === blogFilters.category)
        .filter(post => articleMatchesSearch(post, blogFilters.query)).length;
    const totalPages = Math.max(1, Math.ceil(totalItems / BLOG_PAGE_SIZE));
    const nextPage = Math.min(totalPages, Math.max(1, blogFilters.page + direction));
    if (nextPage !== blogFilters.page) renderBlogPageWithTransition(nextPage);
}

function renderBlogPosts() {
    const container = document.getElementById('blog-feed');
    if (!container) return;
    const isArabic = getCurrentLang() === 'ar';
    const searchInput = document.getElementById('article-search');
    // Placeholder comes from the JSON dictionaries (single source of truth)
    if (searchInput && typeof window.t === 'function') {
        searchInput.placeholder = window.t('ph.search.articles.in.english.or.arabic');
    }
    const clearButton = document.getElementById('article-search-clear');
    if (clearButton) clearButton.classList.toggle('is-visible', Boolean(blogFilters.query));

    document.querySelectorAll('.knowledge-category').forEach(button => {
        button.classList.toggle('active', button.dataset.category === blogFilters.category);
    });

    updateBlogModePresentation();
    if (typeof window.updateDocumentMetadata === 'function' && window.currentPageId === 'blog') {
        window.updateDocumentMetadata('blog');
    }

    const latestYear = getMostRecentBlogYear();
    let filtered = blogPosts
        .filter(post => blogFilters.mode === 'latest'
            ? post.year === latestYear
            : blogFilters.year === 'all' || post.year === blogFilters.year)
        .filter(post => blogFilters.category === 'all' || post.category === blogFilters.category)
        .filter(post => articleMatchesSearch(post, blogFilters.query))
        .sort((a, b) => new Date(b.date) - new Date(a.date));
    if (blogFilters.mode === 'latest') filtered = filtered.slice(0, 7);

    const totalFiltered = filtered.length;
    const totalPages = blogFilters.mode === 'all' ? Math.max(1, Math.ceil(totalFiltered / BLOG_PAGE_SIZE)) : 1;
    blogFilters.page = Math.min(Math.max(1, blogFilters.page), totalPages);
    if (blogFilters.mode === 'all') {
        const pageStart = (blogFilters.page - 1) * BLOG_PAGE_SIZE;
        filtered = filtered.slice(pageStart, pageStart + BLOG_PAGE_SIZE);
    }

    container.innerHTML = '';
    updateKnowledgeResultCount(totalFiltered);
    updateArchiveCounts();
    updateBlogPagination(totalFiltered, totalPages);
    renderBlogDropdown();

    if (!totalFiltered) {
        container.innerHTML = `
            <div class="knowledge-empty">
                <i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
                <h3>${tr('blog.noArticlesFound', 'No articles found', 'لم يتم العثور على مقالات')}</h3>
                <p>${tr('blog.noArticlesHint', 'Try a different keyword, category, or archive year.', 'جرّب كلمة بحث أو تصنيفًا أو سنة مختلفة.')}</p>
            </div>`;
        return;
    }

    filtered.forEach(post => {
        const div = document.createElement('article');
        div.className = 'card p-7 blog-card group cursor-pointer';
        div.setAttribute('data-year', post.year);
        div.setAttribute('data-category', post.category);
        div.setAttribute('role', 'button');
        div.setAttribute('tabindex', '0');
        div.setAttribute('aria-label', `${isArabic ? 'اقرأ المقال: ' : 'Read article: '}${isArabic ? post.titleAr : post.title}`);
        div.innerHTML = `
            <div class="flex items-center justify-between gap-4 text-xs font-mono mb-4 text-white/45">
                <span>${isArabic ? post.dateAr : post.date}</span>
                <span class="font-bold text-white">${isArabic ? post.categoryAr : post.category}</span>
            </div>
            <h3 class="font-bold text-[19px] leading-tight tracking-tight mb-3 group-hover:text-white transition-colors">${isArabic ? post.titleAr : post.title}</h3>
            <p class="text-white/55 text-sm leading-relaxed mb-6">${isArabic ? post.excerptAr : post.excerpt}</p>
            <div class="flex items-center justify-between text-xs font-mono">
                <div class="flex items-center text-white/50 group-hover:text-white transition-colors">
                    <span>${tr('blog.readFullArticle', 'Read Full Article', 'اقرأ المقال كاملاً')}</span>
                    <i class="fa-solid fa-arrow-${isArabic ? 'left' : 'right'} text-white ml-2 group-hover:ml-3 transition-all"></i>
                </div>
                <div class="text-white/40">${isArabic ? post.readTimeAr : post.readTime}</div>
            </div>
        `;
        div.onclick = () => showBlogModal(post, div);
        div.onkeydown = event => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                showBlogModal(post, div);
            }
        };
        container.appendChild(div);
    });
}

function filterBlog(year, clickedBtn) {
    blogFilters.year = year;
    blogFilters.mode = 'all';
    blogFilters.page = 1;
    document.querySelectorAll('.archive-btn').forEach(btn => btn.classList.remove('active'));
    if (clickedBtn) clickedBtn.classList.add('active');
    renderBlogPosts();
}

function filterBlogCategory(category, clickedButton) {
    blogFilters.category = category;
    blogFilters.mode = 'all';
    blogFilters.page = 1;
    document.querySelectorAll('.knowledge-category').forEach(button => button.classList.remove('active'));
    if (clickedButton) clickedButton.classList.add('active');
    renderBlogPosts();
}

function handleArticleSearch(value) {
    blogFilters.query = value;
    blogFilters.mode = 'all';
    blogFilters.page = 1;
    renderBlogPosts();
}

function clearArticleSearch() {
    const input = document.getElementById('article-search');
    blogFilters.query = '';
    blogFilters.mode = 'all';
    blogFilters.page = 1;
    if (input) {
        input.value = '';
        input.focus();
    }
    renderBlogPosts();
}

function openLatestArticles() {
    blogFilters.year = getMostRecentBlogYear();
    blogFilters.category = 'all';
    blogFilters.query = '';
    blogFilters.mode = 'latest';
    blogFilters.page = 1;
    const search = document.getElementById('article-search');
    if (search) search.value = '';
    document.querySelectorAll('.archive-btn').forEach((button, index) => button.classList.toggle('active', index === 0));
    document.querySelectorAll('.knowledge-category').forEach(button => {
        button.classList.toggle('active', button.dataset.category === 'all');
    });
    if (typeof window.closeBlogNavDropdown === 'function') window.closeBlogNavDropdown();
    if (typeof window.closeMobileBlogMenu === 'function') window.closeMobileBlogMenu();
    if (typeof window.navigateTo === 'function') window.navigateTo('blog');
    renderBlogPosts();
}

function openBlogArchive() {
    blogFilters.year = 'all';
    blogFilters.category = 'all';
    blogFilters.query = '';
    blogFilters.mode = 'all';
    blogFilters.page = 1;
    const search = document.getElementById('article-search');
    if (search) search.value = '';
    document.querySelectorAll('.archive-btn').forEach((button, index) => button.classList.toggle('active', index === 0));
    document.querySelectorAll('.knowledge-category').forEach(button => {
        button.classList.toggle('active', button.dataset.category === 'all');
    });
    if (typeof window.closeBlogNavDropdown === 'function') window.closeBlogNavDropdown();
    if (typeof window.closeMobileBlogMenu === 'function') window.closeMobileBlogMenu();
    if (typeof window.navigateTo === 'function') window.navigateTo('blog');
    renderBlogPosts();
}

function openBlogArticleById(id, trigger = null) {
    const post = blogPosts.find(article => article.id === id);
    if (!post) return;
    if (typeof window.closeBlogNavDropdown === 'function') window.closeBlogNavDropdown();
    if (typeof window.closeMobileBlogMenu === 'function') window.closeMobileBlogMenu();
    if (typeof window.closeMobileNavigation === 'function') window.closeMobileNavigation();
    showBlogModal(post, trigger);
}

/* ==================================================================
 * Markdown rendering
 * ================================================================== */

// Article cache after loading from separate files (avoids re-fetching when an article is opened more than once)
const markdownCache = new Map();
const ARTICLES_BASE_PATH = '../content/articles/';

function fetchArticleMarkdown(id, language) {
    const key = `${id}-${language}`;
    if (markdownCache.has(key)) return Promise.resolve(markdownCache.get(key));
    const path = `${ARTICLES_BASE_PATH}${id}-${language}.md`;
    return fetch(path)
        .then(res => { if (!res.ok) throw new Error(`Failed to load ${path}`); return res.text(); })
        .then(text => { const md = text.trim(); markdownCache.set(key, md); return md; })
        .catch(err => {
            console.warn('[blog] markdown load failed for', path, err);
            // fallback: try reading the content from an inline <script> tag in HTML (backward compatibility)
            const sourceId = language === 'ar' ? `article-${id}-ar-markdown` : `article-${id}-en-markdown`;
            const inline = document.getElementById(sourceId)?.textContent?.trim() || '';
            markdownCache.set(key, inline);
            return inline;
        });
}

function getArticleMarkdownSource(details, language = getCurrentLang()) {
    if (!details) return '';
    // Use the synchronous legacy path only when content is already in cache or DOM
    // (for compatibility when called synchronously on first render).
    const id = Object.entries(blogPosts).find(([,p]) => p === details || (p && p.id == details))?.[0];
    const sourceId = language === 'ar' ? details.markdownIdAR : details.markdownIdEN;
    if (sourceId) {
        const key = `${id}-${language}`;
        if (markdownCache.has(key)) return markdownCache.get(key);
        const inline = document.getElementById(sourceId)?.textContent?.trim();
        if (inline) { markdownCache.set(key, inline); return inline; }
    }
    return '';
}

function renderInlineMarkdown(text = '') {
    let output = escapeArticleText(text);
    output = output.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    output = output.replace(/`([^`]+)`/g, '<code class="article-inline-code">$1</code>');
    output = output.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    output = output.replace(/__([^_]+)__/g, '<strong>$1</strong>');
    output = output.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    return output;
}

function renderInternetJourneyFlow(codeLines = []) {
    const rawSteps = codeLines.map(line => line.trim()).filter(line => line && line !== '↓');
    const stepDefinitions = [
        { icon: 'fa-water', en: 'Submarine Cable', ar: 'الكابل البحري', technical: 'Submarine Cable', stageEn: 'Ocean Backbone', stageAr: 'العمود البحري' },
        { icon: 'fa-anchor', en: 'Cable Landing Station', ar: 'محطة إنزال الكابل', technical: 'Cable Landing Station', stageEn: 'Landing Point', stageAr: 'نقطة الإنزال' },
        { icon: 'fa-road', en: 'Terrestrial Fiber', ar: 'الألياف الأرضية', technical: 'Terrestrial Fiber', stageEn: 'Land Transport', stageAr: 'النقل الأرضي' },
        { icon: 'fa-arrows-to-circle', en: 'Meet-Me Room', ar: 'غرفة الربط الرئيسية', technical: 'MMR · Meet-Me Room', stageEn: 'Carrier Interconnect', stageAr: 'ربط المزودين' },
        { icon: 'fa-table-cells-large', en: 'Optical Distribution Frame', ar: 'إطار توزيع الألياف', technical: 'ODF · Optical Distribution Frame', stageEn: 'Fiber Distribution', stageAr: 'توزيع الألياف' },
        { icon: 'fa-link', en: 'Cross Connect', ar: 'الربط المتقاطع', technical: 'Cross Connect', stageEn: 'Physical Link', stageAr: 'الربط المادي' },
        { icon: 'fa-sitemap', en: 'Distribution Layer', ar: 'طبقة التوزيع', technical: 'MDA / POD', stageEn: 'Network Distribution', stageAr: 'توزيع الشبكة' },
        { icon: 'fa-server', en: 'Server Rack', ar: 'رف الخوادم', technical: 'Rack', stageEn: 'Compute Rack', stageAr: 'رف المعالجة' },
        { icon: 'fa-globe', en: 'Application Server', ar: 'السيرفر النهائي', technical: 'Server', stageEn: 'Digital Service', stageAr: 'الخدمة الرقمية' }
    ];
    const steps = rawSteps.map((raw, index) => stepDefinitions[index] || { icon: 'fa-circle-nodes', en: raw, ar: raw, technical: raw, stageEn: 'Network Stage', stageAr: 'مرحلة الشبكة' });
    const isArabic = getCurrentLang() === 'ar';
    return `<div class="internet-journey-flow" role="region" aria-label="${isArabic ? 'مخطط رحلة الإنترنت' : 'Internet journey diagram'}">
        <div class="internet-journey-flow__header">
            <span class="internet-journey-flow__heading"><span class="internet-journey-flow__eyebrow">${isArabic ? 'مسار الاتصال' : 'Connection Path'}</span><span class="internet-journey-flow__count">${isArabic ? `${steps.length} مراحل` : `${steps.length} stages`}</span></span>
        </div>
        <div class="internet-journey-flow__viewport" tabindex="0">
            <div class="internet-journey-flow__track" role="list">
                ${steps.map((step, index) => `<div class="internet-journey-flow__step" role="listitem">
                    <span class="internet-journey-flow__step-top"><span class="internet-journey-flow__node"><i class="fa-solid ${step.icon}" aria-hidden="true"></i></span><span class="internet-journey-flow__index">${String(index + 1).padStart(2, '0')}</span></span>
                    <span class="internet-journey-flow__copy"><span class="internet-journey-flow__stage">${isArabic ? step.stageAr : step.stageEn}</span><span class="internet-journey-flow__label">${isArabic ? step.ar : step.en}</span><span class="internet-journey-flow__technical" dir="ltr">${step.technical}</span></span>
                </div>`).join('')}
            </div>
        </div>
        <div class="internet-journey-flow__footer">
            <span class="internet-journey-flow__controls">
                <button type="button" class="internet-journey-flow__control" onclick="scrollInternetJourney(this, -1)" aria-label="${isArabic ? 'تحريك لليسار' : 'Scroll left'}"><i class="fa-solid fa-arrow-left" aria-hidden="true"></i></button>
                <button type="button" class="internet-journey-flow__control" onclick="scrollInternetJourney(this, 1)" aria-label="${isArabic ? 'تحريك لليمين' : 'Scroll right'}"><i class="fa-solid fa-arrow-right" aria-hidden="true"></i></button>
            </span>
            <span class="internet-journey-flow__drag-hint"><i class="fa-solid fa-hand-pointer" aria-hidden="true"></i>${isArabic ? 'اسحب لاستكشاف المراحل' : 'Drag to explore stages'}</span>
        </div>
    </div>`;
}

function scrollInternetJourney(button, direction) {
    const viewport = button?.closest('.internet-journey-flow')?.querySelector('.internet-journey-flow__viewport');
    if (!viewport) return;
    viewport.scrollBy({ left: direction * Math.min(430, viewport.clientWidth * 0.72), behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
}

function enhanceInternetJourneyFlows() {
    document.querySelectorAll('.internet-journey-flow__viewport').forEach(viewport => {
        if (viewport.dataset.dragReady === 'true') return;
        viewport.dataset.dragReady = 'true';
        let dragging = false;
        let startX = 0;
        let startScroll = 0;
        viewport.addEventListener('pointerdown', event => {
            if (event.pointerType === 'touch') return;
            dragging = true;
            startX = event.clientX;
            startScroll = viewport.scrollLeft;
            viewport.classList.add('is-dragging');
            viewport.setPointerCapture(event.pointerId);
        });
        viewport.addEventListener('pointermove', event => {
            if (!dragging) return;
            viewport.scrollLeft = startScroll - (event.clientX - startX);
        });
        const stopDragging = event => {
            if (!dragging) return;
            dragging = false;
            viewport.classList.remove('is-dragging');
            if (event?.pointerId !== undefined && viewport.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId);
        };
        viewport.addEventListener('pointerup', stopDragging);
        viewport.addEventListener('pointercancel', stopDragging);
        viewport.addEventListener('keydown', event => {
            if (event.key === 'ArrowLeft') { event.preventDefault(); viewport.scrollBy({ left: -210, behavior: 'smooth' }); }
            if (event.key === 'ArrowRight') { event.preventDefault(); viewport.scrollBy({ left: 210, behavior: 'smooth' }); }
        });
        if (document.documentElement.dir === 'rtl') requestAnimationFrame(() => { viewport.scrollLeft = viewport.scrollWidth; });
    });
}

function renderArticleDiagram(details, isArabic) {
    if (details.hideMedia) return '';
    if (details.image && details.image.src) {
        const src = String(details.image.src).replace(/\s+/g, ''); // strip accidental spaces in URL
        const alt = isArabic ? (details.image.altAr || details.image.alt || '') : (details.image.alt || '');
        const caption = isArabic ? (details.image.captionAr || details.captionAr) : (details.image.caption || details.caption);
        return `
            <figure class="article-figure">
                <img src="${escapeArticleText(src)}" alt="${escapeArticleText(alt)}" loading="eager" referrerpolicy="no-referrer" crossorigin="anonymous">
                ${caption ? `<figcaption class="article-caption">${caption}</figcaption>` : ''}
            </figure>`;
    }

    const diagrams = {
        fiber: ['CORE', 'ODF-A', 'ODF-B', 'EDGE'],
        'zero-trust': ['IDENTITY', 'POLICY', 'SERVICES', 'REMOTE'],
        automation: ['NETBOX', 'VALIDATE', 'DEPLOY', 'VERIFY'],
        security: ['WEB', 'APP', 'DATABASE', 'SHARED'],
        observability: ['EXPORT', 'PROMETHEUS', 'GRAFANA', 'ALERT'],
        routing: ['EDGE-A', 'BGP POLICY', 'EDGE-B', 'UPSTREAM']
    };
    const labels = diagrams[details.visual] || diagrams.fiber;
    const caption = isArabic ? details.captionAr : details.caption;
    return `
        <figure class="article-figure">
            <div class="article-visual" data-visual="${details.visual}">
                <svg viewBox="0 0 800 360" role="img" aria-label="${escapeArticleText(caption || '')}">
                    <path class="diagram-line" d="M140 182 C220 82 292 82 370 180 S520 278 660 176"/>
                    <path class="diagram-line diagram-line--active" d="M140 182 C235 205 300 152 370 180 S525 153 660 176"/>
                    <path class="diagram-line" d="M140 182 L370 180 L660 176" stroke-dasharray="5 8"/>
                    <circle class="diagram-node" cx="140" cy="182" r="38"/>
                    <circle class="diagram-node" cx="315" cy="108" r="31"/>
                    <circle class="diagram-node diagram-node--active" cx="370" cy="180" r="8"/>
                    <circle class="diagram-node" cx="520" cy="254" r="31"/>
                    <circle class="diagram-node" cx="660" cy="176" r="38"/>
                    <circle class="diagram-node diagram-node--active" cx="237" cy="171" r="4"/>
                    <circle class="diagram-node diagram-node--active" cx="548" cy="170" r="4"/>
                    <text class="diagram-label" x="140" y="238" text-anchor="middle">${labels[0]}</text>
                    <text class="diagram-label" x="315" y="62" text-anchor="middle">${labels[1]}</text>
                    <text class="diagram-label" x="520" y="310" text-anchor="middle">${labels[2]}</text>
                    <text class="diagram-label" x="660" y="232" text-anchor="middle">${labels[3]}</text>
                </svg>
            </div>
            <figcaption class="article-caption">${caption}</figcaption>
        </figure>`;
}

function renderMarkdownArticle(markdown = '') {
    const lines = markdown.replace(/\r/g, '').split('\n');
    const html = [];
    let paragraph = [];
    let listType = null;
    let listItems = [];
    let tableRows = [];
    let inCode = false;
    let codeLanguage = '';
    let codeLines = [];
    let skippedTitle = false;

    const flushParagraph = () => {
        if (!paragraph.length) return;
        html.push(`<p>${renderInlineMarkdown(paragraph.join(' '))}</p>`);
        paragraph = [];
    };
    const flushList = () => {
        if (!listType || !listItems.length) return;
        html.push(`<${listType}>${listItems.map(item => `<li>${renderInlineMarkdown(item)}</li>`).join('')}</${listType}>`);
        listType = null;
        listItems = [];
    };
    const flushTable = () => {
        if (!tableRows.length) return;
        const rows = tableRows.map(row => row.trim().replace(/^\||\|$/g, '').split('|').map(cell => cell.trim()));
        const hasDivider = rows[1]?.every(cell => /^:?-{3,}:?$/.test(cell));
        const head = rows[0] || [];
        const body = hasDivider ? rows.slice(2) : rows.slice(1);
        html.push(`<div class="article-table-wrap"><table class="article-table"><thead><tr>${head.map(cell => `<th>${renderInlineMarkdown(cell)}</th>`).join('')}</tr></thead><tbody>${body.map(row => `<tr>${row.map(cell => `<td>${renderInlineMarkdown(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
        tableRows = [];
    };
    const flushBlocks = () => { flushParagraph(); flushList(); flushTable(); };

    lines.forEach(line => {
        const trimmed = line.trim();
        if (trimmed.startsWith('```')) {
            flushBlocks();
            if (!inCode) {
                inCode = true;
                codeLanguage = trimmed.slice(3).trim();
                codeLines = [];
            } else {
                if (codeLanguage.toLowerCase() === 'journey') html.push(renderInternetJourneyFlow(codeLines));
                else html.push(`<pre class="article-code"${codeLanguage ? ` data-language="${escapeArticleText(codeLanguage)}"` : ''}><code>${escapeArticleText(codeLines.join('\n'))}</code></pre>`);
                inCode = false;
                codeLanguage = '';
                codeLines = [];
            }
            return;
        }
        if (inCode) { codeLines.push(line); return; }
        if (/^\|.*\|$/.test(trimmed)) {
            flushParagraph();
            flushList();
            tableRows.push(trimmed);
            return;
        }
        if (tableRows.length) flushTable();
        if (!trimmed) { flushParagraph(); flushList(); return; }
        const linkedMarkdownImage = trimmed.match(/^\[!\[([^\]]*)\]\((https?:\/\/[^)\s]+|data:image\/[^;]+;base64,[A-Za-z0-9+/=]+)\)\]\((https?:\/\/[^)\s]+)\)$/);
        if (linkedMarkdownImage) {
            flushBlocks();
            const alt = escapeArticleText(linkedMarkdownImage[1] || 'Video');
            const source = escapeArticleText(linkedMarkdownImage[2]);
            const target = escapeArticleText(linkedMarkdownImage[3]);
            html.push(`<a class="article-video-card" href="${target}" target="_blank" rel="noopener noreferrer" aria-label="${alt}"><img class="article-video-card__image" src="${source}" alt="${alt}" loading="lazy" decoding="async" referrerpolicy="no-referrer"><span class="article-video-card__play"><i class="fa-solid fa-play" aria-hidden="true"></i></span><span class="article-video-card__label">${alt}</span></a>`);
            return;
        }
        const markdownImage = trimmed.match(/^!\[([^\]]*)\]\((https?:\/\/[^)\s]+|data:image\/[^;]+;base64,[A-Za-z0-9+/=]+|\.{1,2}\/[^)\s]+)(?:\s+["']([^"']*)["'])?\)$/);
        if (markdownImage) {
            flushBlocks();
            const alt = escapeArticleText(markdownImage[1] || '');
            const source = escapeArticleText(markdownImage[2]);
            const caption = escapeArticleText(markdownImage[3] || markdownImage[1] || '');
            html.push(`<figure class="article-figure article-markdown-figure"><a href="${source}" target="_blank" rel="noopener noreferrer"><img src="${source}" alt="${alt}" loading="lazy" decoding="async" referrerpolicy="no-referrer"></a>${caption ? `<figcaption class="article-caption">${caption}</figcaption>` : ''}</figure>`);
            return;
        }
        const heading = trimmed.match(/^(#{1,6})\s+(.+)$/);
        if (heading) {
            flushParagraph(); flushList();
            if (heading[1].length === 1 && !skippedTitle) { skippedTitle = true; return; }
            const level = heading[1].length <= 2 ? 2 : 3;
            html.push(`<h${level}>${renderInlineMarkdown(heading[2])}</h${level}>`);
            return;
        }
        if (/^[-*]\s+/.test(trimmed)) {
            flushParagraph();
            if (listType && listType !== 'ul') flushList();
            listType = 'ul';
            listItems.push(trimmed.replace(/^[-*]\s+/, ''));
            return;
        }
        if (/^\d+\.\s+/.test(trimmed)) {
            flushParagraph();
            if (listType && listType !== 'ol') flushList();
            listType = 'ol';
            listItems.push(trimmed.replace(/^\d+\.\s+/, ''));
            return;
        }
        if (/^---+$/.test(trimmed)) {
            flushBlocks();
            html.push('<hr>');
            return;
        }
        if (listType) flushList();
        paragraph.push(trimmed);
    });
    if (inCode && codeLines.length) html.push(`<pre class="article-code"><code>${escapeArticleText(codeLines.join('\n'))}</code></pre>`);
    flushBlocks();
    return html.join('');
}

function renderArticleSections(details, isArabic) {
    const markdown = getArticleMarkdownSource(details, isArabic ? 'ar' : 'en');
    if (markdown) return `<div class="article-markdown">${renderMarkdownArticle(markdown)}</div>`;
    return (details.sections || []).map((section, index) => {
        const title = isArabic ? section.titleAr : section.title;
        const paragraphs = isArabic ? section.paragraphsAr : section.paragraphs;
        const bullets = isArabic ? section.bulletsAr : section.bullets;
        const image = section.image ? `
            <figure class="article-figure">
                <img src="${section.image.src}" alt="${escapeArticleText(isArabic ? (section.image.altAr || section.image.alt || '') : (section.image.alt || ''))}" loading="lazy">
                ${section.image.caption ? `<figcaption class="article-caption">${isArabic ? (section.image.captionAr || section.image.caption) : section.image.caption}</figcaption>` : ''}
            </figure>` : '';
        return `
            <section class="article-section">
                <span class="article-section__number">${tr('blog.section', 'SECTION', 'القسم')} ${String(index + 1).padStart(2, '0')}</span>
                <h2>${title}</h2>
                ${(paragraphs || []).map(paragraph => `<p>${paragraph}</p>`).join('')}
                ${image}
                ${bullets && bullets.length ? `<ul class="article-list">${bullets.map(item => `<li>${item}</li>`).join('')}</ul>` : ''}
                ${section.code ? `<pre class="article-code"><code>${escapeArticleText(section.code)}</code></pre>` : ''}
            </section>`;
    }).join('');
}

function enhanceArticleCodeBlocks() {
    const body = document.getElementById('modal-body');
    if (!body) return;
    body.querySelectorAll('pre.article-code').forEach((pre, index) => {
        if (pre.closest('.article-code-wrap')) return;
        const wrapper = document.createElement('div');
        wrapper.className = 'article-code-wrap';
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'article-code-copy';
        button.setAttribute('aria-label', getCurrentLang() === 'ar' ? `نسخ المقطع البرمجي ${index + 1}` : `Copy code block ${index + 1}`);
        button.innerHTML = `<i class="fa-regular fa-copy" aria-hidden="true"></i><span>${tr('toast.copy', 'Copy', 'نسخ')}</span>`;
        button.addEventListener('click', () => copyArticleCode(pre, button));
        pre.parentNode.insertBefore(wrapper, pre);
        wrapper.appendChild(pre);
        wrapper.appendChild(button);
    });
}

async function copyArticleCode(pre, button) {
    const code = pre?.querySelector('code')?.textContent || pre?.textContent || '';
    if (!code.trim() || !button) return;
    try {
        await navigator.clipboard.writeText(code);
    } catch (error) {
        const textarea = document.createElement('textarea');
        textarea.value = code;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        textarea.remove();
    }

    const label = button.querySelector('span');
    const icon = button.querySelector('i');
    button.classList.add('is-copied');
    if (label) label.textContent = tr('toast.copied', 'Copied', 'تم النسخ');
    if (icon) icon.className = 'fa-solid fa-check';
    window.clearTimeout(button._copyResetTimer);
    button._copyResetTimer = window.setTimeout(() => {
        button.classList.remove('is-copied');
        if (label) label.textContent = tr('toast.copy', 'Copy', 'نسخ');
        if (icon) icon.className = 'fa-regular fa-copy';
    }, 1700);
}

/* ==================================================================
 * Table of contents (TOC) + related articles + Giscus
 * ================================================================== */

function renderArticleTableOfContents(post, isArabic) {
    const toc = document.getElementById('article-toc');
    const list = document.getElementById('article-toc-list');
    const title = document.getElementById('article-toc-title');
    const current = document.getElementById('article-toc-current');
    const toggle = document.getElementById('article-toc-toggle');
    const body = document.getElementById('modal-body');
    if (!toc || !list || !title || !current || !toggle || !body) return;

    articleTocHeadings = [...body.querySelectorAll('.article-section h2, .article-markdown h2')];
    articleTocActiveIndex = articleTocHeadings.length ? 0 : -1;
    title.textContent = tr('blog.onThisPage', 'On this page', 'في هذه الصفحة');
    toc.setAttribute('aria-label', title.textContent);
    toc.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    list.innerHTML = '';

    articleTocHeadings.forEach((heading, index) => {
        heading.id = `article-${post.id}-section-${index + 1}`;
        heading.style.scrollMarginTop = '150px';
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `article-toc__item${index === 0 ? ' is-active' : ''}`;
        button.dataset.target = heading.id;
        button.setAttribute('aria-label', `${isArabic ? 'انتقل إلى' : 'Go to'} ${heading.textContent.trim()}`);
        if (index === 0) button.setAttribute('aria-current', 'location');
        button.innerHTML = `<span class="article-toc__number">${String(index + 1).padStart(2, '0')}</span><span class="article-toc__text"></span>`;
        button.querySelector('.article-toc__text').textContent = heading.textContent.trim();
        button.addEventListener('click', () => scrollArticleToSection(heading.id));
        list.appendChild(button);
    });

    current.textContent = articleTocHeadings[0]?.textContent.trim() || '';
    toc.hidden = articleTocHeadings.length === 0;
    if (!toc.hidden && window.gsap && !prefersReducedMotion()) {
        window.gsap.fromTo(toc, { autoAlpha: 0, x: isArabic ? 8 : -8 }, { autoAlpha: 1, x: 0, duration: 0.4, ease: 'power2.out', clearProps: 'transform' });
    }
}

function toggleArticleToc(forceOpen = null) {
    const toc = document.getElementById('article-toc');
    const toggle = document.getElementById('article-toc-toggle');
    if (!toc || !toggle || window.innerWidth >= 1240) return;
    const open = forceOpen === null ? !toc.classList.contains('is-open') : Boolean(forceOpen);
    toc.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
}

function scrollArticleToSection(sectionId) {
    const reader = document.getElementById('article-reader');
    const heading = document.getElementById(sectionId);
    if (!reader || !heading) return;
    const toolbarOffset = window.innerWidth <= 1180 ? 150 : 92;
    const targetTop = reader.scrollTop + heading.getBoundingClientRect().top - reader.getBoundingClientRect().top - toolbarOffset;
    toggleArticleToc(false);
    reader.scrollTo({ top: Math.max(0, targetTop), behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
}

function updateArticleTocState() {
    const reader = document.getElementById('article-reader');
    const list = document.getElementById('article-toc-list');
    if (!reader || !list || !articleTocHeadings.length) return;
    const activationLine = window.innerWidth <= 1180 ? 180 : 125;
    let activeIndex = 0;
    articleTocHeadings.forEach((heading, index) => {
        if (heading.getBoundingClientRect().top - reader.getBoundingClientRect().top <= activationLine) activeIndex = index;
    });
    if (activeIndex === articleTocActiveIndex) return;
    articleTocActiveIndex = activeIndex;
    const current = document.getElementById('article-toc-current');
    if (current) current.textContent = articleTocHeadings[activeIndex]?.textContent.trim() || '';
    list.querySelectorAll('.article-toc__item').forEach((button, index) => {
        const active = index === activeIndex;
        button.classList.toggle('is-active', active);
        if (active) button.setAttribute('aria-current', 'location');
        else button.removeAttribute('aria-current');
    });
}

function getRelatedArticles(post, limit = 3) {
    const sourceKeywords = new Set([...(post.keywords || []), ...(post.keywordsAr || [])].map(normalizeArticleSearch));
    return blogPosts
        .filter(candidate => candidate.id !== post.id)
        .map(candidate => {
            let score = candidate.category === post.category ? 8 : 0;
            [...(candidate.keywords || []), ...(candidate.keywordsAr || [])].forEach(keyword => {
                if (sourceKeywords.has(normalizeArticleSearch(keyword))) score += 2;
            });
            if (candidate.year === post.year) score += 1;
            return { candidate, score };
        })
        .sort((a, b) => b.score - a.score || new Date(b.candidate.date) - new Date(a.candidate.date))
        .slice(0, limit)
        .map(item => item.candidate);
}

function renderRelatedArticles(post, isArabic) {
    const container = document.getElementById('related-articles');
    if (!container) return;
    const related = getRelatedArticles(post);
    container.innerHTML = `
        <div class="related-articles__header">
            <div>
                <div class="related-articles__eyebrow">${tr('blog.continueLearning', 'Continue Learning', 'تابع القراءة')}</div>
                <h2 id="related-articles-title">${tr('blog.relatedArticles', 'Related Articles', 'مقالات ذات صلة')}</h2>
            </div>
        </div>
        <div class="related-grid">
            ${related.map(article => `
                <button type="button" class="related-card" onclick="openRelatedArticle(${article.id})" aria-label="${escapeArticleText(isArabic ? article.titleAr : article.title)}">
                    <span class="related-card__category">${isArabic ? article.categoryAr : article.category}</span>
                    <span class="related-card__title">${isArabic ? article.titleAr : article.title}</span>
                    <span class="related-card__arrow"><i class="fa-solid fa-arrow-right" aria-hidden="true"></i></span>
                </button>`).join('')}
        </div>`;
}

function openRelatedArticle(id) {
    const post = blogPosts.find(article => article.id === id);
    const reader = document.getElementById('article-reader');
    if (!post || !reader) return;
    activeBlogPost = post;
    populateBlogModal(post);
    reader.scrollTo({ top: 0, behavior: 'smooth' });
    window.setTimeout(updateArticleProgress, 120);
}

function loadGiscusForArticle(post) {
    const container = document.getElementById('giscus-container');
    if (!container || !post) return;
    container.innerHTML = '';
    const configured = GISCUS_CONFIG.repo && GISCUS_CONFIG.repoId && GISCUS_CONFIG.category && GISCUS_CONFIG.categoryId;
    if (!configured) {
        container.innerHTML = `<div class="giscus-setup-notice">${getCurrentLang() === 'ar'
            ? 'تم تجهيز قسم التعليقات عبر Giscus. لتفعيله، فعّل GitHub Discussions وثبّت تطبيق Giscus ثم أضف معرّف تصنيف المناقشات في إعداد GISCUS_CONFIG.'
            : 'The Giscus comments area is ready. To activate it, enable GitHub Discussions, install the Giscus app, and add the discussion category ID in GISCUS_CONFIG.'}</div>`;
        return;
    }
    const mount = document.createElement('div');
    mount.className = 'giscus';
    container.appendChild(mount);
    const script = document.createElement('script');
    script.src = 'https://giscus.app/client.js';
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.setAttribute('data-repo', GISCUS_CONFIG.repo);
    script.setAttribute('data-repo-id', GISCUS_CONFIG.repoId);
    script.setAttribute('data-category', GISCUS_CONFIG.category);
    script.setAttribute('data-category-id', GISCUS_CONFIG.categoryId);
    script.setAttribute('data-mapping', 'pathname');
    script.setAttribute('data-strict', '0');
    script.setAttribute('data-reactions-enabled', '1');
    script.setAttribute('data-emit-metadata', '0');
    script.setAttribute('data-input-position', 'bottom');
    script.setAttribute('data-theme', 'preferred_color_scheme');
    script.setAttribute('data-lang', 'en');
    container.appendChild(script);
}

/* ==================================================================
 * sharing/progress and open/close modal
 * ================================================================== */

function getArticleShareUrl(post = activeBlogPost) {
    if (!post) return window.location.href;
    const url = new URL(window.location.href);
    url.searchParams.set('article', getArticleSlug(post));
    url.hash = 'blog';
    return url.href;
}

function openShareWindow(url) {
    window.open(url, '_blank', 'noopener,noreferrer,width=760,height=620');
}

async function copyArticleLink(url) {
    try {
        await navigator.clipboard.writeText(url);
    } catch (error) {
        const input = document.createElement('textarea');
        input.value = url;
        input.style.position = 'fixed';
        input.style.opacity = '0';
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        input.remove();
    }
    const button = document.getElementById('article-copy-link');
    if (!button) return;
    button.classList.add('is-copied');
    const label = button.querySelector('span');
    if (label) label.textContent = tr('toast.linkCopied', 'Link Copied', 'تم نسخ الرابط');
    window.setTimeout(() => {
        button.classList.remove('is-copied');
        if (label) label.textContent = tr('copy.link', 'Copy Link', 'نسخ الرابط');
    }, 1800);
}

function shareArticle(platform) {
    if (!activeBlogPost) return;
    const url = getArticleShareUrl(activeBlogPost);
    const title = getCurrentLang() === 'ar' ? activeBlogPost.titleAr : activeBlogPost.title;
    if (platform === 'x') openShareWindow(`https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`);
    else if (platform === 'linkedin') openShareWindow(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`);
    else if (platform === 'facebook') openShareWindow(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`);
    else if (platform === 'copy') copyArticleLink(url);
    else if (platform === 'print') window.print();
}

function scrollArticleToTop() {
    document.getElementById('article-reader')?.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateArticleProgress() {
    const reader = document.getElementById('article-reader');
    const progress = document.getElementById('article-progress-bar');
    if (!reader || !progress) return;
    const available = reader.scrollHeight - reader.clientHeight;
    const ratio = available > 0 ? Math.min(1, reader.scrollTop / available) : 0;
    progress.style.transform = `scaleX(${ratio})`;
    const backToTop = document.getElementById('article-back-to-top');
    if (backToTop) backToTop.classList.toggle('is-visible', reader.scrollTop > 420);
    updateArticleTocState();
}

async function populateBlogModal(post) {
    const details = articleDetails[post.id];
    const isArabic = getCurrentLang() === 'ar';
    const dateEl = document.getElementById('modal-date');
    const titleEl = document.getElementById('modal-title');
    const tagEl = document.getElementById('modal-tag');
    const readtimeEl = document.getElementById('modal-readtime');
    const introEl = document.getElementById('modal-intro');
    const mediaEl = document.getElementById('modal-media');
    const bodyEl = document.getElementById('modal-body');

    if (dateEl) dateEl.textContent = isArabic ? post.dateAr : post.date;
    if (titleEl) titleEl.textContent = isArabic ? post.titleAr : post.title;
    if (tagEl) tagEl.textContent = post.tag;
    if (readtimeEl) readtimeEl.textContent = isArabic ? post.readTimeAr : post.readTime;
    if (introEl) introEl.textContent = details ? (isArabic ? details.introAr : details.intro) : (isArabic ? post.contentAr : post.content);
    if (mediaEl) mediaEl.innerHTML = details ? renderArticleDiagram(details, isArabic) : '';

    // Load markdown content either from cache/inline or from a separate markdown file
    let markdownHtml = '';
    if (details) {
        // Try loading the external file; if it fails, fall back to the inline version
        const language = isArabic ? 'ar' : 'en';
        let md = '';
        try {
            md = await fetchArticleMarkdown(post.id, language);
        } catch (e) {
            md = getArticleMarkdownSource(details, language);
        }
        if (md) {
            markdownHtml = `<div class="article-markdown">${renderMarkdownArticle(md)}</div>`;
        } else {
            // markdown content not yet available; show a spinner until loaded
            markdownHtml = `<div class="article-loading" style="padding:40px;text-align:center;color:var(--text-muted)"><i class="fa-solid fa-spinner fa-spin"></i></div>`;
            fetchArticleMarkdown(post.id, language).then(loaded => {
                if (bodyEl && activeBlogPost && activeBlogPost.id === post.id) {
                    const wrapper = bodyEl.querySelector('.article-markdown, .article-loading');
                    if (wrapper) wrapper.outerHTML = `<div class="article-markdown">${renderMarkdownArticle(loaded)}</div>`;
                    enhanceArticleCodeBlocks();
                    enhanceInternetJourneyFlows();
                    renderArticleTableOfContents(post, isArabic);
                }
            }).catch(() => {});
        }
    }
    if (bodyEl) bodyEl.innerHTML = details
        ? renderArticleSections(details, isArabic) + markdownHtml
        : `<section class="article-section"><p>${isArabic ? post.contentAr : post.content}</p></section>`;

    enhanceArticleCodeBlocks();
    enhanceInternetJourneyFlows();
    renderArticleTableOfContents(post, isArabic);
    renderRelatedArticles(post, isArabic);
    loadGiscusForArticle(post);

    // Update URL
    try {
        const url = new URL(window.location.href);
        url.searchParams.set('article', getArticleSlug(post));
        url.hash = 'blog';
        history.replaceState({ article: post.id }, '', url.toString());
    } catch (_) { /* noop */ }
}

async function showBlogModal(post, trigger = null) {
    const modal = document.getElementById('blog-modal');
    const reader = document.getElementById('article-reader');
    if (!modal || !reader) return;
    activeBlogPost = post;
    window.activeBlogPost = post;
    lastArticleFocus = trigger || document.activeElement;
    populateBlogModal(post);
    blogModalTimeline?.kill();
    modal.classList.remove('hidden');
    modal.classList.add('block');
    reader.scrollTop = 0;
    updateArticleProgress();

    // Bind the scroll event if not already bound
    if (!blogArticleScrollListenerBound) {
        reader.addEventListener('scroll', updateArticleProgress, { passive: true });
        blogArticleScrollListenerBound = true;
    }

    // Click outside the TOC (mobile)
    if (!blogOutsideClickListenerBound) {
        document.addEventListener('click', event => {
            if (window.innerWidth < 1240 && !event.target.closest('#article-toc')) toggleArticleToc(false);
        });
        blogOutsideClickListenerBound = true;
    }
    if (!blogEscapeListenerBound) {
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape') {
                const blogModalEl = document.getElementById('blog-modal');
                const projectModalEl = document.getElementById('project-modal');
                if (blogModalEl && !blogModalEl.classList.contains('hidden')) {
                    // Only close if no project modal is currently open
                    if (!projectModalEl || projectModalEl.classList.contains('hidden')) closeBlogModal();
                }
                toggleArticleToc(false);
            }
        });
        blogEscapeListenerBound = true;
    }

    if (window.gsap && !prefersReducedMotion()) {
        blogModalTimeline = window.gsap.timeline({
            defaults: { overwrite: 'auto' },
            onComplete: () => document.getElementById('article-close-button')?.focus()
        });
        blogModalTimeline
            .fromTo(modal, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.24, ease: 'power1.out' }, 0)
            .fromTo(reader,
                { y: 18, scale: 0.992 },
                { y: 0, scale: 1, duration: 0.48, ease: 'power3.out', clearProps: 'transform' },
                0.03
            );
    } else {
        modal.style.opacity = '';
        modal.style.visibility = '';
        window.setTimeout(() => document.getElementById('article-close-button')?.focus(), 60);
    }
}

function closeBlogModal() {
    const modal = document.getElementById('blog-modal');
    const reader = document.getElementById('article-reader');
    if (!modal || modal.classList.contains('hidden')) return;
    blogModalTimeline?.kill();

    const finishClose = () => {
        modal.classList.remove('block');
        modal.classList.add('hidden');
        window.gsap?.set(modal, { clearProps: 'opacity,visibility' });
        if (reader) {
            reader.scrollTop = 0;
            window.gsap?.set(reader, { clearProps: 'transform,opacity' });
        }
        document.getElementById('article-back-to-top')?.classList.remove('is-visible');
        activeBlogPost = null;
        window.activeBlogPost = null;
        articleTocHeadings = [];
        articleTocActiveIndex = -1;
        if (lastArticleFocus && lastArticleFocus.isConnected) lastArticleFocus.focus();
        // Remove the article query param from the URL
        try {
            const url = new URL(window.location.href);
            url.searchParams.delete('article');
            url.hash = 'blog';
            history.replaceState({ page: 'blog' }, '', url.toString());
        } catch (_) { /* noop */ }
    };

    if (window.gsap && !prefersReducedMotion()) {
        blogModalTimeline = window.gsap.timeline({ onComplete: finishClose });
        blogModalTimeline
            .to(reader, { autoAlpha: 0.45, y: 10, scale: 0.995, duration: 0.22, ease: 'power2.in' }, 0)
            .to(modal, { autoAlpha: 0, duration: 0.24, ease: 'power1.in' }, 0.05);
    } else {
        finishClose();
    }
}

/* ==================================================================
 * Initialize the blog
 * ================================================================== */

function init() {
    // Wire the search input
    blogSearchInput = document.getElementById('article-search');
    if (blogSearchInput) {
        blogSearchInput.addEventListener('input', (e) => handleArticleSearch(e.target.value));
    }

    // Initial render
    renderBlogDropdown();
    updateArchiveCounts();
    renderBlogPosts();

    // Open the article specified in the URL (if any, via ?article=slug)
    try {
        const requestedSlug = new URLSearchParams(window.location.search).get('article');
        if (requestedSlug) {
            const post = blogPosts.find(p => getArticleSlug(p) === requestedSlug || String(p.id) === requestedSlug);
            if (post && typeof window.navigateTo === 'function') {
                window.navigateTo('blog', false);
                window.setTimeout(() => showBlogModal(post), 120);
            }
        }
    } catch (_) { /* noop */ }
}

/* ==================================================================
 * Expose functions on window for onclick handlers
 * ================================================================== */

function exposeGlobals() {
    window.renderBlogPosts = renderBlogPosts;
    window.renderBlogDropdown = renderBlogDropdown;
    window.filterBlog = filterBlog;
    window.filterBlogCategory = filterBlogCategory;
    window.changeBlogPage = changeBlogPage;
    window.openBlogArchive = openBlogArchive;
    window.openLatestArticles = openLatestArticles;
    window.openBlogArticleById = openBlogArticleById;
    window.showBlogModal = showBlogModal;
    window.populateBlogModal = populateBlogModal;
    window.closeBlogModal = closeBlogModal;
    window.updateArticleProgress = updateArticleProgress;
    window.toggleArticleToc = toggleArticleToc;
    window.scrollArticleToTop = scrollArticleToTop;
    window.shareArticle = shareArticle;
    window.copyArticleLink = copyArticleLink;
    window.clearArticleSearch = clearArticleSearch;
    window.handleArticleSearch = handleArticleSearch;
    window.openRelatedArticle = openRelatedArticle;
    window.scrollInternetJourney = scrollInternetJourney;
    window.activeBlogPost = activeBlogPost;
    window.blogPosts = blogPosts;
    window.blogFilters = blogFilters;
    window.BLOG_PAGE_SIZE = BLOG_PAGE_SIZE;
}

exposeGlobals();

/* ==================================================================
 * Exports
 * ================================================================== */

export {
    init,
    blogPosts,
    blogFilters,
    BLOG_PAGE_SIZE,
    renderBlogPosts,
    renderBlogDropdown,
    filterBlog,
    filterBlogCategory,
    changeBlogPage,
    openBlogArchive,
    openLatestArticles,
    showBlogModal,
    closeBlogModal,
    populateBlogModal,
    updateArticleProgress,
    toggleArticleToc,
    scrollArticleToTop,
    shareArticle,
    clearArticleSearch,
    handleArticleSearch,
    activeBlogPost,
    getArticleSlug,
    getArticleShareUrl
};

export default init;
