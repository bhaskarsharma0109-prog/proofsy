export interface TemplateDefinition {
  id: string;
  name: string;
  desc: string;
  color: string;
  accent: string;
  border: string;
  tags: string[];
}

export const TEMPLATE_DEFINITIONS: TemplateDefinition[] = [
  {
    id: "classic",
    name: "Classic",
    desc: "Traditional certificate with elegant borders and serif typography. Perfect for formal events and ceremonies.",
    color: "from-amber-100 to-amber-50",
    accent: "border-amber-400",
    border: "border-amber-200",
    tags: ["Formal", "Traditional"],
  },
  {
    id: "modern",
    name: "Modern",
    desc: "Institution-style participation certificate with club logos, blue academic hierarchy, signature row, and magenta angular accents.",
    color: "from-fuchsia-50 to-white",
    accent: "border-fuchsia-700",
    border: "border-fuchsia-200",
    tags: ["Academic", "Workshop"],
  },
  {
    id: "elegant",
    name: "Elegant",
    desc: "Luxurious gold accents with ornamental corner details. Ideal for executive programs and galas.",
    color: "from-yellow-50 to-amber-50",
    accent: "border-yellow-500",
    border: "border-yellow-200",
    tags: ["Luxury", "Premium"],
  },
  {
    id: "corporate",
    name: "Corporate",
    desc: "Professional branded layout with a company header section. Built for compliance and training.",
    color: "from-blue-50 to-indigo-50",
    accent: "border-blue-500",
    border: "border-blue-200",
    tags: ["Professional", "Training"],
  },
  {
    id: "academic",
    name: "Academic",
    desc: "University-style certificate with seal placement and traditional hierarchy. Suited for education.",
    color: "from-emerald-50 to-green-50",
    accent: "border-emerald-500",
    border: "border-emerald-200",
    tags: ["Education", "University"],
  },
  {
    id: "creative",
    name: "Creative",
    desc: "Bold, modern design with asymmetric layout and vibrant colors. For workshops and hackathons.",
    color: "from-purple-50 to-pink-50",
    accent: "border-purple-500",
    border: "border-purple-200",
    tags: ["Bold", "Workshop"],
  },
];

export function getTemplateDefinition(templateId: string) {
  return TEMPLATE_DEFINITIONS.find((template) => template.id === templateId) || TEMPLATE_DEFINITIONS[1];
}
