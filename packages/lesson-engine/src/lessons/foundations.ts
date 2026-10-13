import type { LessonDefinition } from '../types';

export const FOUNDATIONS_FIRST_SKETCH = {
  id: 'foundations-first-sketch',
  version: '1.0.0',
  title: 'Your first sketch',
  description:
    'Learn how a flat sketch becomes the starting point for a 3D model.',
  objectives: [
    'Recognize that sketches are flat profiles used to define later features.',
    'Open a sketch on the Top plane in a Part Studio.',
  ],
  prerequisites: ['An editable Onshape Part Studio is open.'],
  steps: [
    {
      id: 'enter-sketch',
      goal: 'Open a sketch on the Top plane',
      action: 'Choose Sketch, then select the Top plane.',
      explanation:
        'A sketch is a flat outline. Later, you can add depth to a closed outline to make a solid feature.',
      semanticTarget: 'top-plane',
      completionSignal: 'finish-sketch',
      requiredEvidence: 'UI_CONFIRMED',
      hints: [
        'Start by finding the Sketch command in the Part Studio toolbar.',
        'After choosing Sketch, select the plane labeled Top.',
        'The plane is a flat reference surface where your outline will live.',
        'If you do not see the plane, check that the feature tree is visible and no dialog is open.',
        'Use Show me to highlight a recognized Top plane control, or open the feature tree and choose Top.',
      ],
      commonErrors: [
        'Selecting a face or a different plane changes the orientation of the sketch.',
        'A selected plane alone does not mean sketch editing has started.',
      ],
      recoveryActions: [
        'Cancel the current command if a dialog is open, then start Sketch again.',
        'Choose Top in the feature tree and check that sketch editing controls appear.',
      ],
    },
  ],
} as const satisfies LessonDefinition;
