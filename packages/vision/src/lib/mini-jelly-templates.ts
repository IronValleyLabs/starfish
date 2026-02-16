export interface MiniJellyTemplate {
  id: string
  name: string
  icon: string
  category: string
  description: string
  defaultGoals: string[]
  /** Key metrics this role is measured on (e.g. ROAS > 2, response time < 1h). Agent works to achieve these and reports to human. */
  defaultKpis?: string[]
  requiredAccess: string[]
  capabilities: string[]
}

export const MINI_JELLY_TEMPLATES: MiniJellyTemplate[] = [
  // Marketing & Sales
  {
    id: 'social-media-manager',
    name: 'Social Media Manager',
    icon: '🎨',
    category: 'Marketing & Sales',
    description:
      'Manages social media accounts, creates posts, responds to comments, and analyzes engagement.',
    defaultGoals: [
      'Post 3 times per day',
      'Respond to comments within 1 hour',
      'Maintain engagement rate > 3%',
      'Report weekly analytics',
    ],
    defaultKpis: ['Engagement rate > 3%', 'Response time to comments < 1 hour', 'Weekly analytics reported'],
    requiredAccess: ['Instagram API', 'Twitter API', 'Facebook API'],
    capabilities: [
      'Content creation',
      'Comment moderation',
      'Analytics',
      'Scheduling',
    ],
  },
  {
    id: 'paid-media-manager',
    name: 'Paid Media Manager',
    icon: '📊',
    category: 'Marketing & Sales',
    description:
      'Manages paid advertising campaigns, optimizes budgets, creates ad variants, and reports ROI.',
    defaultGoals: [
      'Keep CPC < $2',
      'Maintain CTR > 2%',
      'Create 3 variants if CTR < 1.5%',
      'Report weekly performance',
    ],
    defaultKpis: ['ROAS (Return on Ad Spend) above target', 'CPA/CPL within budget', 'CTR > 2%', 'Weekly performance + recommendations to human'],
    requiredAccess: ['Meta Ads API', 'Google Ads API'],
    capabilities: [
      'Campaign optimization',
      'Creative generation',
      'A/B testing',
      'Budget management',
    ],
  },
  {
    id: 'content-manager',
    name: 'Content Manager',
    icon: '✍️',
    category: 'Marketing & Sales',
    description:
      'Creates blog posts, articles, and marketing copy. Manages content calendar and SEO.',
    defaultGoals: [
      'Publish 2 blog posts per week',
      'Optimize for SEO (score > 80)',
      'Research trending topics daily',
      'Maintain content calendar',
    ],
    requiredAccess: ['WordPress API', 'SEO Tools'],
    capabilities: [
      'Content writing',
      'SEO optimization',
      'Research',
      'Publishing',
    ],
  },
  {
    id: 'email-marketing-manager',
    name: 'Email Marketing Manager',
    icon: '📧',
    category: 'Marketing & Sales',
    description:
      'Creates email campaigns, manages subscriber lists, A/B tests subject lines, and tracks conversions.',
    defaultGoals: [
      'Send 2 campaigns per week',
      'Maintain open rate > 20%',
      'A/B test subject lines',
      'Segment audiences',
    ],
    defaultKpis: ['Open rate > 20%', 'Click-through rate', 'Conversion rate per campaign', 'Report findings to human'],
    requiredAccess: ['Mailchimp API', 'SendGrid API'],
    capabilities: [
      'Campaign creation',
      'List management',
      'A/B testing',
      'Analytics',
    ],
  },

  // Support & Operations
  {
    id: 'customer-support',
    name: 'Customer Support Specialist',
    icon: '💬',
    category: 'Support & Operations',
    description:
      'Responds to customer inquiries, resolves issues, and maintains high satisfaction scores.',
    defaultGoals: [
      'Respond within 5 minutes',
      'Resolve 80% of tickets without escalation',
      'Maintain satisfaction > 4.5/5',
      'Update knowledge base weekly',
    ],
    defaultKpis: ['First response time < 5 min', 'Resolution rate 80%+', 'CSAT > 4.5/5', 'Surface insights to human'],
    requiredAccess: ['Zendesk API', 'Intercom API', 'Slack'],
    capabilities: [
      'Ticket resolution',
      'Live chat',
      'Knowledge base',
      'Escalation',
    ],
  },
  {
    id: 'sales-rep',
    name: 'Sales Representative',
    icon: '📞',
    category: 'Support & Operations',
    description:
      'Qualifies leads, schedules demos, follows up with prospects, and closes deals.',
    defaultGoals: [
      'Qualify 20 leads per day',
      'Schedule 5 demos per week',
      'Follow up within 24 hours',
      'Close 10% of qualified leads',
    ],
    defaultKpis: ['Leads qualified per day', 'Demos scheduled per week', 'Conversion rate on qualified leads', 'Report pipeline and blockers to human'],
    requiredAccess: ['HubSpot API', 'Salesforce API', 'Calendar API'],
    capabilities: [
      'Lead qualification',
      'Demo scheduling',
      'Follow-ups',
      'CRM management',
    ],
  },
  {
    id: 'logistics-coordinator',
    name: 'Logistics Coordinator',
    icon: '📦',
    category: 'Support & Operations',
    description:
      'Manages inventory, tracks shipments, coordinates with suppliers, and optimizes delivery routes.',
    defaultGoals: [
      'Track all shipments in real-time',
      'Maintain inventory accuracy > 98%',
      'Optimize delivery routes',
      'Report delays within 1 hour',
    ],
    requiredAccess: ['Shipstation API', 'Inventory System'],
    capabilities: [
      'Shipment tracking',
      'Inventory management',
      'Route optimization',
      'Supplier coordination',
    ],
  },
  {
    id: 'devops-engineer',
    name: 'DevOps Engineer',
    icon: '🔧',
    category: 'Support & Operations',
    description:
      'Monitors server health, deploys updates, manages backups, and responds to incidents.',
    defaultGoals: [
      'Monitor uptime 24/7',
      'Deploy updates within 10 minutes',
      'Backup daily at 2am',
      'Respond to incidents < 5 minutes',
    ],
    requiredAccess: ['AWS API', 'GitHub API', 'Monitoring Tools'],
    capabilities: [
      'Server monitoring',
      'Deployment',
      'Backup management',
      'Incident response',
    ],
  },

  // Data & Analytics
  {
    id: 'data-analyst',
    name: 'Data Analyst',
    icon: '📈',
    category: 'Data & Analytics',
    description:
      'Analyzes data, creates dashboards, identifies trends, and provides actionable insights.',
    defaultGoals: [
      'Generate weekly reports',
      'Identify 3 insights per week',
      'Maintain dashboard accuracy',
      'Alert on anomalies',
    ],
    defaultKpis: ['Weekly reports delivered', 'Actionable insights per week', 'Anomalies flagged', 'Recommendations to human'],
    requiredAccess: ['Database', 'Analytics Tools'],
    capabilities: [
      'Data analysis',
      'Dashboard creation',
      'Trend identification',
      'Reporting',
    ],
  },
  {
    id: 'market-researcher',
    name: 'Market Researcher',
    icon: '🔍',
    category: 'Data & Analytics',
    description:
      'Researches market trends, analyzes competitors, identifies opportunities, and reports findings.',
    defaultGoals: [
      'Monitor 10 competitors daily',
      'Identify 2 opportunities per week',
      'Track industry trends',
      'Report monthly insights',
    ],
    requiredAccess: ['Web Scraping', 'Industry APIs'],
    capabilities: [
      'Competitor analysis',
      'Trend research',
      'Opportunity identification',
      'Reporting',
    ],
  },
  {
    id: 'qa-tester',
    name: 'QA Tester',
    icon: '🧪',
    category: 'Data & Analytics',
    description:
      'Tests features, identifies bugs, runs automated tests, and ensures quality standards.',
    defaultGoals: [
      'Run tests on every deploy',
      'Identify bugs within 1 hour',
      'Maintain test coverage > 80%',
      'Report weekly quality metrics',
    ],
    requiredAccess: ['Testing Framework', 'CI/CD Pipeline'],
    capabilities: [
      'Automated testing',
      'Bug identification',
      'Quality assurance',
      'Reporting',
    ],
  },
  {
    id: 'bi-analyst',
    name: 'Business Intelligence Analyst',
    icon: '📊',
    category: 'Data & Analytics',
    description:
      'Creates BI dashboards, tracks KPIs, forecasts trends, and provides strategic insights.',
    defaultGoals: [
      'Update KPI dashboard daily',
      'Forecast monthly trends',
      'Alert on KPI deviations',
      'Present quarterly insights',
    ],
    requiredAccess: ['Database', 'BI Tools'],
    capabilities: [
      'KPI tracking',
      'Forecasting',
      'Dashboard creation',
      'Strategic analysis',
    ],
  },

  // Finance & Admin
  {
    id: 'bookkeeper',
    name: 'Bookkeeper',
    icon: '💰',
    category: 'Finance & Admin',
    description:
      'Manages accounts, tracks expenses, reconciles transactions, and generates financial reports.',
    defaultGoals: [
      'Reconcile accounts daily',
      'Track all expenses',
      'Generate monthly reports',
      'Alert on unusual transactions',
    ],
    defaultKpis: ['Accounts reconciled on time', 'Expense accuracy', 'Monthly reports to human', 'Unusual transactions flagged'],
    requiredAccess: ['QuickBooks API', 'Bank APIs'],
    capabilities: [
      'Account reconciliation',
      'Expense tracking',
      'Financial reporting',
      'Transaction monitoring',
    ],
  },
  {
    id: 'hr-coordinator',
    name: 'HR Coordinator',
    icon: '📝',
    category: 'Finance & Admin',
    description:
      'Manages employee records, coordinates onboarding, tracks PTO, and handles HR inquiries.',
    defaultGoals: [
      'Process onboarding within 24 hours',
      'Track PTO accurately',
      'Respond to HR inquiries < 2 hours',
      'Update employee records weekly',
    ],
    requiredAccess: ['HRIS System', 'Calendar API'],
    capabilities: [
      'Onboarding',
      'PTO tracking',
      'Employee records',
      'HR support',
    ],
  },
  {
    id: 'invoicing-specialist',
    name: 'Invoicing Specialist',
    icon: '🧾',
    category: 'Finance & Admin',
    description:
      'Creates invoices, tracks payments, sends reminders, and manages accounts receivable.',
    defaultGoals: [
      'Send invoices within 24 hours',
      'Track payment status',
      'Send reminders for overdue invoices',
      'Report monthly receivables',
    ],
    defaultKpis: ['Invoices sent within 24h', 'Days receivable', 'Overdue reminders sent', 'Monthly receivables report to human'],
    requiredAccess: ['Invoicing Software', 'Payment Gateway'],
    capabilities: [
      'Invoice creation',
      'Payment tracking',
      'Reminders',
      'Receivables management',
    ],
  },
  {
    id: 'executive-assistant',
    name: 'Executive Assistant',
    icon: '📅',
    category: 'Finance & Admin',
    description:
      'Manages calendar, schedules meetings, handles emails, and coordinates tasks.',
    defaultGoals: [
      'Respond to emails within 1 hour',
      'Schedule meetings efficiently',
      'Manage calendar conflicts',
      'Prepare daily briefings',
    ],
    requiredAccess: ['Calendar API', 'Email API'],
    capabilities: [
      'Calendar management',
      'Email handling',
      'Meeting scheduling',
      'Task coordination',
    ],
  },

  // Creative & Production
  {
    id: 'graphic-designer',
    name: 'Graphic Designer',
    icon: '🎨',
    category: 'Creative & Production',
    description:
      'Creates graphics, designs marketing materials, maintains brand consistency, and produces visuals.',
    defaultGoals: [
      'Create 5 designs per week',
      'Maintain brand guidelines',
      'Respond to requests < 24 hours',
      'Update design library monthly',
    ],
    requiredAccess: ['Design Tools', 'Brand Assets'],
    capabilities: [
      'Graphic design',
      'Brand consistency',
      'Visual production',
      'Asset management',
    ],
  },
  {
    id: 'video-producer',
    name: 'Video Producer',
    icon: '🎬',
    category: 'Creative & Production',
    description:
      'Edits videos, creates video content, adds subtitles, and optimizes for platforms.',
    defaultGoals: [
      'Produce 2 videos per week',
      'Add subtitles to all videos',
      'Optimize for each platform',
      'Maintain video library',
    ],
    requiredAccess: ['Video Editing Tools', 'Platform APIs'],
    capabilities: [
      'Video editing',
      'Content creation',
      'Platform optimization',
      'Subtitle generation',
    ],
  },
  {
    id: 'photo-editor',
    name: 'Photo Editor',
    icon: '🖼️',
    category: 'Creative & Production',
    description:
      'Edits photos, enhances images, maintains photo library, and ensures quality standards.',
    defaultGoals: [
      'Edit 20 photos per day',
      'Maintain quality standards',
      'Organize photo library',
      'Respond to requests < 12 hours',
    ],
    requiredAccess: ['Photo Editing Tools', 'Storage'],
    capabilities: [
      'Photo editing',
      'Image enhancement',
      'Library management',
      'Quality control',
    ],
  },
  {
    id: 'audio-producer',
    name: 'Audio Producer',
    icon: '🎵',
    category: 'Creative & Production',
    description:
      'Edits audio, creates podcasts, adds music, and optimizes sound quality.',
    defaultGoals: [
      'Produce 1 podcast per week',
      'Edit audio within 24 hours',
      'Maintain audio quality standards',
      'Update audio library',
    ],
    requiredAccess: ['Audio Editing Tools', 'Music Library'],
    capabilities: [
      'Audio editing',
      'Podcast production',
      'Sound optimization',
      'Library management',
    ],
  },
]

export function getMiniJellysByCategory() {
  const categories = MINI_JELLY_TEMPLATES.reduce(
    (acc, template) => {
      if (!acc[template.category]) {
        acc[template.category] = []
      }
      acc[template.category].push(template)
      return acc
    },
    {} as Record<string, MiniJellyTemplate[]>
  )
  return categories
}
