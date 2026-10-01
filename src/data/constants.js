export const SDGS = [
  { id: 4, code: 'SDG 4', title: 'Quality Education', color: '#c5192d' },
  { id: 9, code: 'SDG 9', title: 'Industry, Innovation & Infrastructure', color: '#fd6925' },
  { id: 11, code: 'SDG 11', title: 'Sustainable Cities & Communities', color: '#fd9d24' },
  { id: 13, code: 'SDG 13', title: 'Climate Action', color: '#3f7e44' },
]

export const SDG_MAP = Object.fromEntries(SDGS.map((s) => [s.id, s]))

export const DIFFICULTIES = ['Beginner', 'Intermediate', 'Advanced']

export const TOPICS = [
  'Line Types & Line Weight',
  'Technical Drawing Conventions',
  'Orthographic Projection',
  'Isometric Projection',
  'Sectional Views',
  'Dimensioning & Annotation',
  'Auxiliary Views',
  'Schematic Diagrams',
  'Cartography & Site Plans',
  'Technical Lettering',
  'Freehand Perspective',
  'Rendering & Shading',
  'Colour Theory',
  'Scale & Measurement',
  'CAD Drafting',
  'Design Process',
]

export const QUARTERS = [
  { id: 'q1', label: 'Quarter 1', theme: 'Foundations of Technical Drawing' },
  { id: 'q2', label: 'Quarter 2', theme: 'Projection & Dimensioning' },
  { id: 'q3', label: 'Quarter 3', theme: 'Structural & Site Applications' },
  { id: 'q4', label: 'Quarter 4', theme: 'Rendering, SDG Impact & Portfolio' },
]

export const SUBJECT = {
  grade: 'Grade 11',
  course: 'Visual Graphics Design',
  strand: 'Technical Drawing & Design',
  school: 'Senior High School',
  section: 'VGD 11 - Section B',
}
