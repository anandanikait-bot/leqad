import type { LessonDefinition } from '../types';

export const FOUNDATIONS_FIRST_SKETCH = {
  id: 'foundations-first-sketch',
  version: '2.0.0',
  title: 'Your First Sketch',
  description:
    'Learn how a precise flat sketch becomes the starting point for a 3D part.',
  objectives: [
    'Recognize a Part Studio, reference planes, and sketch-editing mode.',
    'Create a rectangle and express its design intent with dimensions.',
    'Explain how a finished 2D sketch can drive a later 3D feature.',
  ],
  prerequisites: ['An editable Onshape Part Studio is open.'],
  steps: [
    {
      id: 'introduction',
      goal: 'Understand what you will build',
      action:
        'Review how a sketch in a Part Studio provides the 2D profile for a later 3D feature.',
      explanation:
        'A Part Studio is where parts are modeled. A sketch defines flat geometry; a later feature such as Extrude can give a closed sketch depth.',
      semanticTarget: null,
      completionSignal: 'introduction-acknowledged',
      requiredEvidence: null,
      completionMode: 'ACKNOWLEDGEMENT',
      allowUnverifiedContinuation: false,
      hints: [
        'A sketch starts as geometry on one flat reference.',
        'Reference planes provide stable places to begin a sketch.',
        'Dimensions record design intent instead of relying on visual size.',
        'Finishing a sketch leaves sketch editing but does not create a solid.',
        'A later feature can use the sketch profile to create 3D geometry.',
      ],
      commonErrors: [
        'Expecting the sketch itself to be a solid part.',
        'Treating visual size as a substitute for dimensions.',
      ],
      recoveryActions: [
        'Review the distinction between a flat sketch and a feature with depth.',
      ],
    },
    {
      id: 'select-reference-plane',
      goal: 'Select the Top reference plane',
      action:
        'Find the Top plane in the feature list and select it as the reference for this sketch.',
      explanation:
        'A reference plane fixes the orientation of a sketch. Leqad can observe a recognized selected Top plane control, but selection alone does not prove sketch editing has begun.',
      semanticTarget: 'top-plane',
      completionSignal: 'top-plane-selected',
      requiredEvidence: 'UI_CONFIRMED',
      completionMode: 'UI_VERIFICATION',
      allowUnverifiedContinuation: true,
      hints: [
        'Look in the feature list for the default reference planes.',
        'Choose the item labeled Top plane, not the Top view control.',
        'The selected item should have Onshape’s selected-state styling.',
        'If more than one plane appears selected, clear the other selection.',
        'Use Show me to highlight a recognized Top plane control.',
      ],
      commonErrors: [
        'Selecting Top view instead of Top plane.',
        'Selecting Front, Right, a face, or more than one reference.',
      ],
      recoveryActions: [
        'Clear the current selection, then select only Top plane in the feature list.',
        'If the plane list is hidden, expand the origin or default geometry section.',
      ],
    },
    {
      id: 'start-sketch',
      goal: 'Enter sketch-editing mode',
      action:
        'With Top plane selected, choose the Sketch command and wait for sketch-editing controls to appear.',
      explanation:
        'The Sketch command opens an editing environment on the chosen reference. Leqad checks supported interface state separately from the plane-selection step.',
      semanticTarget: 'sketch',
      completionSignal: 'sketch-editing',
      requiredEvidence: 'UI_CONFIRMED',
      completionMode: 'UI_VERIFICATION',
      allowUnverifiedContinuation: true,
      hints: [
        'Find Sketch in the Part Studio toolbar.',
        'Keep Top plane selected before choosing Sketch.',
        'Sketch-editing controls should replace or extend the normal toolbar.',
        'A Finish sketch control is a useful sign that sketch editing is active.',
        'Cancel any unrelated dialog, reselect Top plane, and choose Sketch again.',
      ],
      commonErrors: [
        'Assuming a selected plane means sketch editing is active.',
        'Starting a sketch on a different plane or face.',
      ],
      recoveryActions: [
        'Cancel the current command, select Top plane, and start Sketch again.',
        'Confirm that the page is an editable Part Studio rather than a read-only version.',
      ],
    },
    {
      id: 'draw-rectangle',
      goal: 'Draw one rectangle',
      action:
        'Choose the Rectangle tool, then click two opposite corners to create a closed four-sided profile.',
      explanation:
        'A rectangle tool can create the four connected lines efficiently. Seeing an active tool does not prove that rectangle geometry exists, so continue without verification if Leqad cannot inspect it.',
      semanticTarget: 'rectangle',
      completionSignal: 'rectangle-created',
      requiredEvidence: 'UI_CONFIRMED',
      completionMode: 'UI_VERIFICATION',
      allowUnverifiedContinuation: true,
      hints: [
        'Find Rectangle in the sketch toolbar.',
        'Choose a first corner near the sketch origin.',
        'Move diagonally and click the opposite corner.',
        'Make sure four connected sides form a closed profile.',
        'Press Escape once to leave the Rectangle tool without leaving the sketch.',
      ],
      commonErrors: [
        'Clicking only once and leaving the rectangle unfinished.',
        'Drawing separate lines that do not form a closed profile.',
      ],
      recoveryActions: [
        'Undo the incomplete geometry and use Rectangle again with two corner clicks.',
        'Zoom in and check that adjacent endpoints meet.',
      ],
    },
    {
      id: 'apply-dimensions',
      goal: 'Set the rectangle to 40 mm by 30 mm',
      action:
        'Use Dimension to set one horizontal side to 40 mm and one vertical side to 30 mm.',
      explanation:
        'Dimensions express design intent: the model should preserve exact values when geometry changes. Without current model evidence, Leqad cannot confirm the actual 40 mm and 30 mm values.',
      semanticTarget: 'dimension',
      completionSignal: 'rectangle-dimensions-40x30',
      requiredEvidence: 'API_CONFIRMED',
      completionMode: 'UI_VERIFICATION',
      allowUnverifiedContinuation: true,
      hints: [
        'Choose Dimension in the sketch toolbar.',
        'Select a horizontal edge, place the dimension, and enter 40 mm.',
        'Select a vertical edge, place the dimension, and enter 30 mm.',
        'Read the displayed values carefully; visual proportions are not evidence.',
        'If a dimension conflicts, remove the conflicting constraint and apply it again.',
      ],
      commonErrors: [
        'Entering both values on edges with the same orientation.',
        'Assuming a roughly 4:3 rectangle has exact dimensions.',
      ],
      recoveryActions: [
        'Edit the horizontal and vertical dimensions individually.',
        'Remove duplicate or conflicting dimensions before retrying.',
      ],
    },
    {
      id: 'finish-sketch',
      goal: 'Finish sketch editing',
      action: 'Choose Finish sketch to return to the Part Studio.',
      explanation:
        'Leaving sketch mode is interface state. It does not by itself prove that the rectangle was committed or that its dimensions are correct.',
      semanticTarget: 'finish-sketch',
      completionSignal: 'sketch-mode-finished',
      requiredEvidence: 'UI_CONFIRMED',
      completionMode: 'UI_VERIFICATION',
      allowUnverifiedContinuation: true,
      hints: [
        'Find Finish sketch in the sketch toolbar.',
        'Complete any open dimension editor before finishing.',
        'Press Escape only to leave an active tool; use Finish sketch to leave editing.',
        'After finishing, the normal Part Studio toolbar should return.',
        'If Finish sketch is unavailable, close the active dialog or tool first.',
      ],
      commonErrors: [
        'Pressing Escape and assuming the sketch was finished.',
        'Treating the disappearance of one tool as proof of committed geometry.',
      ],
      recoveryActions: [
        'Close any active editor, then choose Finish sketch explicitly.',
        'If the sketch closes unexpectedly, reopen it and inspect the geometry.',
      ],
    },
    {
      id: 'understand-result',
      goal: 'Recognize what the sketch created',
      action:
        'Observe that the result is still a 2D sketch, then identify Extrude as a possible next feature.',
      explanation:
        'The finished sketch stores a 2D profile and driving dimensions. A feature such as Extrude can use that profile to create a solid; finishing the sketch alone does not.',
      semanticTarget: null,
      completionSignal: 'result-understood',
      requiredEvidence: null,
      completionMode: 'ACKNOWLEDGEMENT',
      allowUnverifiedContinuation: false,
      hints: [
        'Look for the sketch as an item in the feature list.',
        'The sketch profile is flat even if the camera shows perspective.',
        'A solid requires a feature that gives the profile depth.',
        'Extrude is one common way to turn a closed profile into a solid.',
        'The 40 mm and 30 mm dimensions drive the profile, not the future depth.',
      ],
      commonErrors: [
        'Calling the finished sketch a solid part.',
        'Confusing sketch dimensions with extrusion depth.',
      ],
      recoveryActions: [
        'Review the feature list and distinguish the sketch item from later 3D features.',
      ],
    },
    {
      id: 'independent-practice',
      goal: 'Repeat the workflow independently',
      action:
        'Create another sketch on a reference plane, draw a closed rectangle, add two dimensions, and finish the sketch without step-by-step prompts.',
      explanation:
        'Independent practice checks whether you can choose the commands and recover from small mistakes. This completion is self-reported and does not count as verified CAD progress.',
      semanticTarget: null,
      completionSignal: 'independent-practice-self-report',
      requiredEvidence: null,
      completionMode: 'SELF_REPORT',
      allowUnverifiedContinuation: false,
      hints: [
        'Recall the sequence: reference, Sketch, geometry, dimensions, finish.',
        'Choose a suitable reference plane before starting Sketch.',
        'Use Rectangle for a closed profile.',
        'Apply one horizontal and one vertical dimension.',
        'Finish the sketch only after reviewing the geometry and dimensions.',
      ],
      commonErrors: [
        'Following the visual shape while forgetting design intent.',
        'Finishing before reviewing dimensions and constraints.',
      ],
      recoveryActions: [
        'Use the five-part sequence to identify the first missed action, then continue from there.',
        'Reopen the sketch if you need to correct geometry or dimensions.',
      ],
    },
  ],
} as const satisfies LessonDefinition;
