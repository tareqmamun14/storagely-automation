export interface ComponentCategory {
  name: string;
  components: string[];
}

export const EDITOR_PALETTE: ComponentCategory[] = [
  {
    name: 'BASE',
    components: [
      'Badge', 'Button', 'Divider', 'Embed', 'FAQ', 'Heading',
      'Icon', 'Icon Text List', 'Image', 'Link List', 'List',
      'Map', 'Review Carousel', 'Reviews', 'Slider', 'Star Rating', 'Text',
    ],
  },
  {
    name: 'LAYOUT',
    components: [
      'Collapsible', 'Container', 'Footer', 'Global Container',
      'Navigation', 'Ordered Container',
    ],
  },
  {
    name: 'FACILITY',
    components: [
      'Amenities List', 'Contact Form', 'Facility Amenities',
      'Facility Gallery', 'Facility Header', 'Facility Header Smart',
      'Facility Reviews', 'Feature Grid', 'Legacy Unit Card',
      'Location Search', 'Location Slider Advanced', 'Locations Map',
      'Modern Unit Card', 'Unit Filters', 'Unit Pricing Grid',
      'Unit Pricing Grid (Cards)',
    ],
  },
  {
    name: 'FORMS',
    components: [
      'Add-on Switch', 'Dynamic Container', 'Easy Date Picker',
      'File Upload', 'Form Container', 'Location Dropdown',
      'Radio Group', 'Select', 'Switch', 'Text Area', 'Text Input',
    ],
  },
  {
    name: 'CHECKOUT',
    components: [
      'Checkout Container', 'Tenant Payment Form',
      'Tenant Protection Plan', 'Unit Checkout Summary',
    ],
  },
  {
    name: 'BLOG',
    components: ['Blog Post Body', 'Blog Post List'],
  },
];

export const ALL_COMPONENTS = EDITOR_PALETTE.flatMap(c => c.components);
export const TOTAL_COMPONENT_COUNT = ALL_COMPONENTS.length;

export const SIDEBAR_TABS = [
  'Components', 'Saved', 'Sections', 'Assets', 'Data Layer', 'AI', 'Settings',
] as const;
export type SidebarTab = (typeof SIDEBAR_TABS)[number];
