import type { DesktopStepView } from './lessonController';

// Desktop presentation only. Lesson rules and stored records stay in the shared engine.
export type DesktopStepCopy = Readonly<{
  heading: string;
  goal: string;
  action: string;
  explanation: string;
  hints: readonly [string, string, string, string, string];
  commonErrors: readonly string[];
  recoveryActions: readonly string[];
}>;

export const DESKTOP_STEP_COPY = {
  introduction: {
    heading: 'Before you begin',
    goal: 'Learn what a sketch is',
    action:
      "A Part Studio is where you create parts in Onshape. In your open Part Studio, you'll draw a flat rectangle, set its size, and finish the sketch.",
    explanation:
      'A sketch is a flat drawing, not a solid part. A later tool, such as Extrude, can give a closed sketch depth.',
    hints: [
      'A Part Studio is the Onshape workspace where you create parts.',
      'A plane is a flat surface where you can draw a sketch.',
      'Dimensions are measurements that set exact sizes.',
      'Finish sketch ends drawing mode. It does not make a solid part.',
      'Extrude is a tool that can give a closed sketch depth. You will not use it in this lesson.',
    ],
    commonErrors: [
      'Expecting a sketch to be a solid 3D part.',
      'Judging the size by eye instead of setting measurements.',
    ],
    recoveryActions: [
      'Think of the sketch as a flat drawing. A later tool adds depth to make a solid part.',
    ],
  },
  'select-reference-plane': {
    heading: 'Choose the Top plane',
    goal: 'Choose where to draw',
    action:
      "In Onshape's list on the left, find Top and click it once. This is the Top plane, a flat guide where you'll draw.",
    explanation:
      'Choosing a plane sets where your sketch will sit. You will start drawing in the next step.',
    hints: [
      'Look for Default geometry in the list on the left. Expand it if the planes are hidden.',
      'Click Top in that list. Top view changes the camera, not the drawing plane.',
      'Look for Top to appear selected in the list.',
      'If another plane is selected too, clear the selection and choose only Top.',
      "If you can't see Top, scroll the list on the left. Look under Default geometry, not in the drawing area.",
    ],
    commonErrors: [
      'Choosing Top view instead of the Top plane.',
      'Choosing Front, Right, a part surface, or several planes.',
    ],
    recoveryActions: [
      'Clear the selection. In the list on the left, click only Top.',
      'If the planes are hidden, expand Default geometry in that list.',
    ],
  },
  'start-sketch': {
    heading: 'Start a sketch',
    goal: 'Open the sketch tools',
    action:
      'With the Top plane selected, click Sketch in the toolbar at the top. Wait for the sketch tools to appear.',
    explanation:
      'Sketch opens drawing mode on the plane you chose. Selecting the plane by itself does not start a sketch.',
    hints: [
      'Look for Sketch in the toolbar at the top of the Part Studio.',
      'Select the Top plane before you click Sketch.',
      'Look for drawing tools in the sketch toolbar.',
      'Look for Finish sketch in the sketch controls. You will use it when your drawing is ready.',
      'If you opened the wrong command, cancel that command. Select the Top plane and click Sketch again.',
    ],
    commonErrors: [
      'Selecting a plane but forgetting to click Sketch.',
      'Starting a sketch on the wrong plane or on a part surface.',
    ],
    recoveryActions: [
      'If you started the wrong sketch, cancel it. Select the Top plane and click Sketch again.',
      'If you cannot edit, check that you opened a Part Studio you have permission to change.',
    ],
  },
  'draw-rectangle': {
    heading: 'Draw a Corner Rectangle',
    goal: 'Draw one closed rectangle',
    action:
      'Click the arrow beside Rectangle in the sketch toolbar. Choose Corner Rectangle. Click once for the first corner. Move diagonally, then click the opposite corner.',
    explanation:
      'Corner Rectangle uses two opposite corners, so it is a simple choice for this drawing. Center Point Rectangle starts at the center; Aligned Rectangle starts with a direction, then a width at a right angle.',
    hints: [
      'Use the arrow beside Rectangle to open the menu. The main icon may use a different rectangle tool.',
      'Choose Corner Rectangle from the menu.',
      'Click once for the first corner. Move diagonally, then click the opposite corner.',
      'Look for four connected sides with no gaps. You will set the exact size in Step 5.',
      'Press Escape once to stop drawing rectangles. Stay in the sketch for the next step.',
    ],
    commonErrors: [
      'Clicking the main Rectangle icon without checking which rectangle tool it uses.',
      'Choosing a tool that starts from the center or needs a direction first.',
      'Clicking only once and leaving the rectangle unfinished.',
      'Drawing separate lines with gaps between their ends.',
    ],
    recoveryActions: [
      'Press Escape to leave the drawing tool. Open the Rectangle arrow and choose Corner Rectangle.',
      'If the menu is closed, click the arrow beside Rectangle to open it. Then choose Corner Rectangle.',
      'Use Undo to remove the unfinished shape. Draw it again with two opposite corner clicks. Check that all four sides meet.',
    ],
  },
  'apply-dimensions': {
    heading: 'Set the size',
    goal: 'Make it 40 mm wide and 30 mm high',
    action:
      'Click Dimension. Click a side that runs left to right, then click beside it. Enter 40 mm and press Enter. Repeat for a side that runs up and down, using 30 mm.',
    explanation:
      "Dimensions tell Onshape the exact sizes you want to keep. Here, they set the rectangle's width and height.",
    hints: [
      'Look for Dimension in the sketch toolbar.',
      'Click a horizontal side, one that runs left to right. Click beside it, enter 40 mm, and press Enter.',
      'Click a vertical side, one that runs up and down. Click beside it, enter 30 mm, and press Enter.',
      'Read both measurements. The width should say 40 mm and the height should say 30 mm.',
      'If Onshape reports a conflict, check the measurement or sketch rule you just added. Correct it only after you find what disagrees.',
    ],
    commonErrors: [
      'Setting both measurements on horizontal sides or both on vertical sides.',
      'Assuming the measurements are correct because the rectangle looks about right.',
    ],
    recoveryActions: [
      'Edit the width and height measurements separately. Enter 40 mm for the width and 30 mm for the height.',
      'Look for duplicate measurements or sketch rules that disagree. Remove only the extra item causing the conflict, then try again.',
    ],
  },
  'finish-sketch': {
    heading: 'Finish the sketch',
    goal: 'Leave sketch editing',
    action:
      'Choose Finish sketch in the sketch controls to return to the Part Studio.',
    explanation:
      'Finish sketch keeps your drawing and returns you to the Part Studio.',
    hints: [
      'Look for Finish sketch in the sketch controls.',
      'If a measurement box is open, finish entering the value first.',
      'Escape leaves a drawing tool. Use Finish sketch to leave sketch editing.',
      'After you finish, look for the normal Part Studio toolbar.',
      'If Finish sketch is unavailable, finish the open measurement or leave the active drawing tool first.',
    ],
    commonErrors: [
      'Pressing Escape and thinking the whole sketch is finished.',
      'Assuming the rectangle is correct because a drawing tool closed.',
    ],
    recoveryActions: [
      'Finish entering any open measurement. Then choose Finish sketch.',
      'If the sketch closed unexpectedly, open it for editing and check the rectangle and its measurements.',
    ],
  },
  'understand-result': {
    heading: 'Understand the result',
    goal: 'See why the sketch is still flat',
    action:
      'Look at your sketch in Onshape. It is still a flat drawing. Extrude is a tool you could use later to give it depth. You do not need to use Extrude now.',
    explanation:
      'A finished sketch is still flat. Extrude can use a closed outline to make a solid with depth.',
    hints: [
      "Look for your sketch in Onshape's list on the left.",
      'The sketch is flat even when the camera shows it at an angle.',
      'A solid part has depth. Finishing a sketch does not add depth.',
      'Extrude is one tool that can give a closed sketch depth.',
      'The 40 mm and 30 mm measurements set width and height, not depth.',
    ],
    commonErrors: [
      'Calling the flat sketch a solid part.',
      'Thinking the width or height measurement also sets the depth.',
    ],
    recoveryActions: [
      'Look at the list on the left. A sketch is the flat drawing. A later tool, such as Extrude, can turn it into a solid part.',
    ],
  },
  'independent-practice': {
    heading: 'Try it yourself',
    goal: 'Make another sketch on your own',
    action:
      'Create another sketch on a plane. Choose Corner Rectangle, draw a closed rectangle, and add one width and one height measurement. Choose Finish sketch when you are ready.',
    explanation:
      'Practicing on your own helps you remember the tools and spot where you get stuck. Use Help if you need a reminder.',
    hints: [
      'Remember the order: choose a plane, start Sketch, draw, set the size, then Finish sketch.',
      'Choose a plane before you click Sketch.',
      'Open the Rectangle arrow. Choose Corner Rectangle and click two opposite corners.',
      'Add one horizontal measurement for width and one vertical measurement for height.',
      'Check the outline and both measurements yourself. Then choose Finish sketch.',
    ],
    commonErrors: [
      'Copying the shape but forgetting to set its measurements.',
      'Finishing before checking the measurements or any size conflicts.',
    ],
    recoveryActions: [
      'Go through the sequence in the first hint. Find the first step you missed and continue from there.',
      'If you already finished, open the sketch for editing to correct the shape or its measurements.',
    ],
  },
} as const satisfies Record<DesktopStepView['id'], DesktopStepCopy>;
