# Desktop Milestone 1 beginner copy review

Status: proposed wording for owner approval. No application copy has changed.

Reviewed source: PR #19 at `b16a0d82f092f2e49fd1c2f6b0d746e29b45008c`. The owner reports that the Windows application launched and the eight-step lesson worked. That feedback establishes the reported written-lesson experience, not CAD observation, geometry verification, or AI availability.

## Scope and shared-code decision

The desktop controller imports `FOUNDATIONS_FIRST_SKETCH` from `packages/lesson-engine/src/lessons/foundations.ts`. The extension also imports that definition in `AssistantPanel.tsx` and `progressStore.ts`. Changing the shared definition would change extension curriculum, hints, summaries, and potentially recognition-facing lesson text. Shared lesson IDs and version also participate in stored progress.

Recommended approach: keep the shared curriculum unchanged and apply desktop-only presentation copy keyed to the same eight step IDs. Render that wording in the desktop lesson, Help, Ask context, and completion summary. Continue using the existing lesson engine and evidence contracts. Do not alter IDs, lesson version, targets, completion signals, evidence requirements, completion modes, hint order, state transitions, or stored records.

A shared curriculum edit would affect the extension and needs a separate, explicit review. Copying the whole lesson definition would duplicate behavior and is unnecessary. The desktop-only presentation approach fits this request. This is a proposal, not an approved implementation.

Preserve the three lesson objectives and the learning goals of all eight steps. Keep five hints per step, the existing disclosure order, all mistakes/recovery topics, and both acknowledgement steps. Step 8 retains its existing freedom to choose practice measurements; it does not introduce a new required size. Keep the official SVGs, palette, fonts, spacing, scrolling, focus behavior, and unavailable visual/AI features unchanged.

## Copy rules

- Use Onshape control names accurately: Top plane, Sketch, Corner Rectangle, Dimension, and Finish sketch. The feature-list label may be `Top`; explain that this is the Top plane.
- Use written directions to known toolbar/list regions. Do not add coordinates, selectors, assumed icon colors, or automatic actions.
- Explain a Part Studio, plane, sketch, dimension, horizontal/vertical direction, and Extrude in plain words when first needed.
- Keep the Corner Rectangle menu arrow, two opposite corner clicks, and 40 mm width / 30 mm height explicit.
- Keep technical verification details in one short status message. Explain the relevant limitation in Help or recovery when needed. Never replace a self-report with a verified result.

The Before values for lesson content come from the shared definition. Before headings come from the desktop `STEP_TITLES` map. The proposal changes desktop presentation only.

## Lesson overview

| Before                                                                    | Proposed                                                                                        |
| ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Your First Sketch                                                         | Your First Sketch                                                                               |
| Learn how a precise flat sketch becomes the starting point for a 3D part. | Draw a flat rectangle, set its size, and learn how a later tool can use it to create a 3D part. |
| Recognize a Part Studio, reference planes, and sketch-editing mode.       | Find a Part Studio and its planes. Tell when sketch editing is open.                            |
| Create a rectangle and express its design intent with dimensions.         | Draw a rectangle and use measurements to set the exact sizes you want to keep.                  |
| Explain how a finished 2D sketch can drive a later 3D feature.            | Explain how a later tool can use a flat sketch to make a solid 3D part.                         |
| An editable Onshape Part Studio is open.                                  | Open an Onshape Part Studio that you have permission to edit.                                   |

## Step 1. Before you begin

Stable step ID: `introduction`.

| Before                                                                                                                                                    | Proposed                                                                                                                                                                          |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Heading: Before you begin                                                                                                                                 | Heading: Before you begin                                                                                                                                                         |
| Goal: Understand what you will build                                                                                                                      | Goal: Learn what a sketch is                                                                                                                                                      |
| Instruction: Review how a sketch in a Part Studio provides the 2D profile for a later 3D feature.                                                         | Instruction: A Part Studio is where you create parts in Onshape. In your open Part Studio, you'll draw a flat rectangle, set its size, and finish the sketch.                     |
| Why it matters: A Part Studio is where parts are modeled. A sketch defines flat geometry; a later feature such as Extrude can give a closed sketch depth. | Why it matters: A sketch is a flat drawing. It can be the starting point for a solid 3D part. Finishing a sketch keeps it flat. A later tool, such as Extrude, can give it depth. |

### Hints, in the existing order

| Before                                                                   | Proposed                                                                                      |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| 1. A sketch starts as geometry on one flat reference.                    | 1. A Part Studio is the Onshape workspace where you create parts.                             |
| 2. Reference planes provide stable places to begin a sketch.             | 2. A plane is a flat surface where you can draw a sketch.                                     |
| 3. Dimensions record design intent instead of relying on visual size.    | 3. Dimensions are measurements that set exact sizes.                                          |
| 4. Finishing a sketch leaves sketch editing but does not create a solid. | 4. Finish sketch ends drawing mode. It does not make a solid part.                            |
| 5. A later feature can use the sketch profile to create 3D geometry.     | 5. Extrude is a tool that can give a closed sketch depth. You will not use it in this lesson. |

### Common mistakes

| Before                                               | Proposed                                                 |
| ---------------------------------------------------- | -------------------------------------------------------- |
| Expecting the sketch itself to be a solid part.      | Expecting a sketch to be a solid 3D part.                |
| Treating visual size as a substitute for dimensions. | Judging the size by eye instead of setting measurements. |

### How to fix it

| Before                                                                 | Proposed                                                                             |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Review the distinction between a flat sketch and a feature with depth. | Think of the sketch as a flat drawing. A later tool adds depth to make a solid part. |

## Step 2. Choose the Top plane

Stable step ID: `select-reference-plane`.

| Before                                                                                                                                                                                       | Proposed                                                                                                                       |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Heading: Choose the Top reference plane                                                                                                                                                      | Heading: Choose the Top plane                                                                                                  |
| Goal: Select the Top reference plane                                                                                                                                                         | Goal: Choose where to draw                                                                                                     |
| Instruction: Find the Top plane in the feature list and select it as the reference for this sketch.                                                                                          | Instruction: In Onshape's list on the left, find Top and click it once. This is the Top plane, a flat guide where you'll draw. |
| Why it matters: A reference plane fixes the orientation of a sketch. Leqad can observe a recognized selected Top plane control, but selection alone does not prove sketch editing has begun. | Why it matters: Choosing a plane sets where your sketch will sit. You will start drawing in the next step.                     |

### Hints, in the existing order

| Before                                                                 | Proposed                                                                                    |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| 1. Look in the feature list for the default reference planes.          | 1. Look for Default geometry in the list on the left. Expand it if the planes are hidden.   |
| 2. Choose the item labeled Top plane, not the Top view control.        | 2. Click Top in that list. Top view changes the camera, not the drawing plane.              |
| 3. The selected item should have Onshape’s selected-state styling.     | 3. Look for Top to appear selected in the list.                                             |
| 4. If more than one plane appears selected, clear the other selection. | 4. If another plane is selected too, clear the selection and choose only Top.               |
| 5. Use Show me to highlight a recognized Top plane control.            | 5. Leqad can't highlight the plane in this app. Find Top in the list and click it yourself. |

### Common mistakes

| Before                                                      | Proposed                                                  |
| ----------------------------------------------------------- | --------------------------------------------------------- |
| Selecting Top view instead of Top plane.                    | Choosing Top view instead of the Top plane.               |
| Selecting Front, Right, a face, or more than one reference. | Choosing Front, Right, a part surface, or several planes. |

### How to fix it

| Before                                                                       | Proposed                                                        |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Clear the current selection, then select only Top plane in the feature list. | Clear the selection. In the list on the left, click only Top.   |
| If the plane list is hidden, expand the origin or default geometry section.  | If the planes are hidden, expand Default geometry in that list. |

## Step 3. Start a sketch

Stable step ID: `start-sketch`.

| Before                                                                                                                                                                    | Proposed                                                                                                                 |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Heading: Start a Sketch                                                                                                                                                   | Heading: Start a sketch                                                                                                  |
| Goal: Enter sketch-editing mode                                                                                                                                           | Goal: Open the sketch tools                                                                                              |
| Instruction: With Top plane selected, choose the Sketch command and wait for sketch-editing controls to appear.                                                           | Instruction: With the Top plane selected, click Sketch in the toolbar at the top. Wait for the sketch tools to appear.   |
| Why it matters: The Sketch command opens an editing environment on the chosen reference. Leqad checks supported interface state separately from the plane-selection step. | Why it matters: Sketch opens drawing mode on the plane you chose. Selecting the plane by itself does not start a sketch. |

### Hints, in the existing order

| Before                                                                       | Proposed                                                                                              |
| ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 1. Find Sketch in the Part Studio toolbar.                                   | 1. Look for Sketch in the toolbar at the top of the Part Studio.                                      |
| 2. Keep Top plane selected before choosing Sketch.                           | 2. Select the Top plane before you click Sketch.                                                      |
| 3. Sketch-editing controls should replace or extend the normal toolbar.      | 3. Look for drawing tools in the sketch toolbar.                                                      |
| 4. A Finish sketch control is a useful sign that sketch editing is active.   | 4. Look for Finish sketch in the sketch controls. You will use it when your drawing is ready.         |
| 5. Cancel any unrelated dialog, reselect Top plane, and choose Sketch again. | 5. If you opened the wrong command, cancel that command. Select the Top plane and click Sketch again. |

### Common mistakes

| Before                                                    | Proposed                                                   |
| --------------------------------------------------------- | ---------------------------------------------------------- |
| Assuming a selected plane means sketch editing is active. | Selecting a plane but forgetting to click Sketch.          |
| Starting a sketch on a different plane or face.           | Starting a sketch on the wrong plane or on a part surface. |

### How to fix it

| Before                                                                            | Proposed                                                                                 |
| --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Cancel the current command, select Top plane, and start Sketch again.             | If you started the wrong sketch, cancel it. Select the Top plane and click Sketch again. |
| Confirm that the page is an editable Part Studio rather than a read-only version. | If you cannot edit, check that you opened a Part Studio you have permission to change.   |

## Step 4. Draw a Corner Rectangle

Stable step ID: `draw-rectangle`.

| Before                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Proposed                                                                                                                                                                                                                                                                                                                                                  |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Heading: Draw a Corner Rectangle                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Heading: Draw a Corner Rectangle                                                                                                                                                                                                                                                                                                                          |
| Goal: Draw one closed rectangle with Corner Rectangle                                                                                                                                                                                                                                                                                                                                                                                                                              | Goal: Draw one closed rectangle                                                                                                                                                                                                                                                                                                                           |
| Instruction: Open the Rectangle dropdown with its arrow, choose Corner Rectangle, then click a first corner and its diagonally opposite corner to draw one closed four-edge profile.                                                                                                                                                                                                                                                                                               | Instruction: Click the arrow beside Rectangle in the sketch toolbar. Choose Corner Rectangle. Click once for the first corner. Move diagonally, then click the opposite corner.                                                                                                                                                                           |
| Why it matters: Corner Rectangle is the simplest introduction to this axis-aligned sketch because you place two opposite corners. Center Point Rectangle starts from the center; Aligned Rectangle establishes a line direction, then a perpendicular width. The group icon can show the last-used variant, so deliberately choose Corner Rectangle from the dropdown. Step 5 adds dimensions. Selecting a tool does not verify geometry; marking this step done is self-reported. | Why it matters: Corner Rectangle is useful here because you choose two opposite corners. Center Point Rectangle starts at the center. Aligned Rectangle first sets a direction, then a width at a right angle. The toolbar icon may show the last Rectangle tool used. Choose Corner Rectangle from the menu to be sure. You will set the size in Step 5. |

### Hints, in the existing order

| Before                                                                                                                                     | Proposed                                                                                              |
| ------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| 1. The group icon can show the last-used Rectangle variant. Open its dropdown arrow instead of relying on the icon.                        | 1. Use the arrow beside Rectangle to open the menu. The main icon may use a different rectangle tool. |
| 2. Choose Corner Rectangle explicitly. If Leqad cannot identify the dropdown, choose Corner Rectangle manually; geometry stays unverified. | 2. Choose Corner Rectangle from the menu.                                                             |
| 3. Click the first corner near the sketch origin, then click the diagonally opposite corner.                                               | 3. Click once for the first corner. Move diagonally, then click the opposite corner.                  |
| 4. Check that four connected edges make one closed profile. Set its dimensions separately in Step 5.                                       | 4. Look for four connected sides with no gaps. You will set the exact size in Step 5.                 |
| 5. Press Escape once to leave Corner Rectangle without leaving the sketch.                                                                 | 5. Press Escape once to stop drawing rectangles. Stay in the sketch for the next step.                |

### Common mistakes

| Before                                                                            | Proposed                                                                        |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Assuming the last-used group icon invokes Corner Rectangle.                       | Clicking the main Rectangle icon without checking which rectangle tool it uses. |
| Using the center-first or direction-first procedure of another Rectangle variant. | Choosing a tool that starts from the center or needs a direction first.         |
| Clicking only once and leaving the rectangle unfinished.                          | Clicking only once and leaving the rectangle unfinished.                        |
| Drawing separate lines that do not form a closed profile.                         | Drawing separate lines with gaps between their ends.                            |

### How to fix it

| Before                                                                                                                | Proposed                                                                                                                |
| --------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Press Escape to leave the active tool. Open the Rectangle dropdown arrow and choose Corner Rectangle deliberately.    | Press Escape to leave the drawing tool. Open the Rectangle arrow and choose Corner Rectangle.                           |
| If Leqad cannot identify the dropdown, choose Corner Rectangle manually; geometry stays unverified.                   | If you cannot find the menu, look for Rectangle in the sketch toolbar. This desktop build cannot point to it for you.   |
| Undo the incomplete profile and use two opposite corner clicks. Check that adjacent endpoints meet before continuing. | Use Undo to remove the unfinished shape. Draw it again with two opposite corner clicks. Check that all four sides meet. |

## Step 5. Set the size

Stable step ID: `apply-dimensions`.

| Before                                                                                                                                                                                                  | Proposed                                                                                                                                                                                                                                                           |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Heading: Add dimensions                                                                                                                                                                                 | Heading: Set the size                                                                                                                                                                                                                                              |
| Goal: Set the rectangle to 40 mm by 30 mm                                                                                                                                                               | Goal: Make it 40 mm wide and 30 mm high                                                                                                                                                                                                                            |
| Instruction: Use Dimension to set one horizontal side to 40 mm and one vertical side to 30 mm.                                                                                                          | Instruction: Click Dimension. Click a side that runs left to right, then click beside it. Enter 40 mm and press Enter. Repeat for a side that runs up and down, using 30 mm.                                                                                       |
| Why it matters: Dimensions express design intent: the model should preserve exact values when geometry changes. Without current model evidence, Leqad cannot confirm the actual 40 mm and 30 mm values. | Why it matters: A dimension is a measurement that sets a sketch's size. The horizontal measurement sets the width. The vertical measurement sets the height. These values tell Onshape the sizes you want to keep, rather than relying on how the rectangle looks. |

### Hints, in the existing order

| Before                                                                             | Proposed                                                                                                                              |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Choose Dimension in the sketch toolbar.                                         | 1. Look for Dimension in the sketch toolbar.                                                                                          |
| 2. Select a horizontal edge, place the dimension, and enter 40 mm.                 | 2. Click a horizontal side, one that runs left to right. Click beside it, enter 40 mm, and press Enter.                               |
| 3. Select a vertical edge, place the dimension, and enter 30 mm.                   | 3. Click a vertical side, one that runs up and down. Click beside it, enter 30 mm, and press Enter.                                   |
| 4. Read the displayed values carefully; visual proportions are not evidence.       | 4. Read both measurements. The width should say 40 mm and the height should say 30 mm.                                                |
| 5. If a dimension conflicts, remove the conflicting constraint and apply it again. | 5. If Onshape reports a conflict, check the measurement or sketch rule you just added. Correct it only after you find what disagrees. |

### Common mistakes

| Before                                                   | Proposed                                                                       |
| -------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Entering both values on edges with the same orientation. | Setting both measurements on horizontal sides or both on vertical sides.       |
| Assuming a roughly 4:3 rectangle has exact dimensions.   | Assuming the measurements are correct because the rectangle looks about right. |

### How to fix it

| Before                                                      | Proposed                                                                                                                        |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Edit the horizontal and vertical dimensions individually.   | Edit the width and height measurements separately. Enter 40 mm for the width and 30 mm for the height.                          |
| Remove duplicate or conflicting dimensions before retrying. | Look for duplicate measurements or sketch rules that disagree. Remove only the extra item causing the conflict, then try again. |

## Step 6. Finish the sketch

Stable step ID: `finish-sketch`.

| Before                                                                                                                                                   | Proposed                                                                                                                                                        |
| -------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Heading: Finish the sketch                                                                                                                               | Heading: Finish the sketch                                                                                                                                      |
| Goal: Finish sketch editing                                                                                                                              | Goal: Leave sketch editing                                                                                                                                      |
| Instruction: Choose Finish sketch to return to the Part Studio.                                                                                          | Instruction: Choose Finish sketch in the sketch controls to return to the Part Studio.                                                                          |
| Why it matters: Leaving sketch mode is interface state. It does not by itself prove that the rectangle was committed or that its dimensions are correct. | Why it matters: Finish sketch keeps your drawing and leaves sketch editing. It does not check whether you drew the rectangle or set the measurements correctly. |

### Hints, in the existing order

| Before                                                                            | Proposed                                                                                                |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| 1. Find Finish sketch in the sketch toolbar.                                      | 1. Look for Finish sketch in the sketch controls.                                                       |
| 2. Complete any open dimension editor before finishing.                           | 2. If a measurement box is open, finish entering the value first.                                       |
| 3. Press Escape only to leave an active tool; use Finish sketch to leave editing. | 3. Escape leaves a drawing tool. Use Finish sketch to leave sketch editing.                             |
| 4. After finishing, the normal Part Studio toolbar should return.                 | 4. After you finish, look for the normal Part Studio toolbar.                                           |
| 5. If Finish sketch is unavailable, close the active dialog or tool first.        | 5. If Finish sketch is unavailable, finish the open measurement or leave the active drawing tool first. |

### Common mistakes

| Before                                                                 | Proposed                                                         |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Pressing Escape and assuming the sketch was finished.                  | Pressing Escape and thinking the whole sketch is finished.       |
| Treating the disappearance of one tool as proof of committed geometry. | Assuming the rectangle is correct because a drawing tool closed. |

### How to fix it

| Before                                                                 | Proposed                                                                                             |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Close any active editor, then choose Finish sketch explicitly.         | Finish entering any open measurement. Then choose Finish sketch.                                     |
| If the sketch closes unexpectedly, reopen it and inspect the geometry. | If the sketch closed unexpectedly, open it for editing and check the rectangle and its measurements. |

## Step 7. Understand the result

Stable step ID: `understand-result`.

| Before                                                                                                                                                                                 | Proposed                                                                                                                                                              |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Heading: Understand the result                                                                                                                                                         | Heading: Understand the result                                                                                                                                        |
| Goal: Recognize what the sketch created                                                                                                                                                | Goal: See why the sketch is still flat                                                                                                                                |
| Instruction: Observe that the result is still a 2D sketch, then identify Extrude as a possible next feature.                                                                           | Instruction: Look at your sketch in Onshape. It is still a flat drawing. Extrude is a tool you could use later to give it depth. You do not need to use Extrude now.  |
| Why it matters: The finished sketch stores a 2D profile and driving dimensions. A feature such as Extrude can use that profile to create a solid; finishing the sketch alone does not. | Why it matters: Your finished sketch can hold the rectangle and its measurements. It is not a solid part. Extrude uses a closed outline to create a solid with depth. |

### Hints, in the existing order

| Before                                                                     | Proposed                                                             |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| 1. Look for the sketch as an item in the feature list.                     | 1. Look for your sketch in Onshape's list on the left.               |
| 2. The sketch profile is flat even if the camera shows perspective.        | 2. The sketch is flat even when the camera shows it at an angle.     |
| 3. A solid requires a feature that gives the profile depth.                | 3. A solid part has depth. Finishing a sketch does not add depth.    |
| 4. Extrude is one common way to turn a closed profile into a solid.        | 4. Extrude is one tool that can give a closed sketch depth.          |
| 5. The 40 mm and 30 mm dimensions drive the profile, not the future depth. | 5. The 40 mm and 30 mm measurements set width and height, not depth. |

### Common mistakes

| Before                                            | Proposed                                                      |
| ------------------------------------------------- | ------------------------------------------------------------- |
| Calling the finished sketch a solid part.         | Calling the flat sketch a solid part.                         |
| Confusing sketch dimensions with extrusion depth. | Thinking the width or height measurement also sets the depth. |

### How to fix it

| Before                                                                          | Proposed                                                                                                                  |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Review the feature list and distinguish the sketch item from later 3D features. | Look at the list on the left. A sketch is the flat drawing. A later tool, such as Extrude, can turn it into a solid part. |

## Step 8. Try it yourself

Stable step ID: `independent-practice`.

| Before                                                                                                                                                                                         | Proposed                                                                                                                                                                                |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Heading: Try it yourself                                                                                                                                                                       | Heading: Try it yourself                                                                                                                                                                |
| Goal: Repeat the workflow independently                                                                                                                                                        | Goal: Make another sketch on your own                                                                                                                                                   |
| Instruction: Create another sketch on a reference plane, draw a closed rectangle, add two dimensions, and finish the sketch without step-by-step prompts.                                      | Instruction: Create another sketch on a plane. Choose Corner Rectangle, draw a closed rectangle, and add one width and one height measurement. Choose Finish sketch when you are ready. |
| Why it matters: Independent practice checks whether you can choose the commands and recover from small mistakes. This completion is self-reported and does not count as verified CAD progress. | Why it matters: Try the same sequence without following each earlier step. If you get stuck, open Help. Mark done records that you say you finished; Leqad cannot check your drawing.   |

### Hints, in the existing order

| Before                                                                   | Proposed                                                                                     |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| 1. Recall the sequence: reference, Sketch, geometry, dimensions, finish. | 1. Remember the order: choose a plane, start Sketch, draw, set the size, then Finish sketch. |
| 2. Choose a suitable reference plane before starting Sketch.             | 2. Choose a plane before you click Sketch.                                                   |
| 3. Use Rectangle for a closed profile.                                   | 3. Open the Rectangle arrow. Choose Corner Rectangle and click two opposite corners.         |
| 4. Apply one horizontal and one vertical dimension.                      | 4. Add one horizontal measurement for width and one vertical measurement for height.         |
| 5. Finish the sketch only after reviewing the geometry and dimensions.   | 5. Check the outline and both measurements yourself. Then choose Finish sketch.              |

### Common mistakes

| Before                                                     | Proposed                                                          |
| ---------------------------------------------------------- | ----------------------------------------------------------------- |
| Following the visual shape while forgetting design intent. | Copying the shape but forgetting to set its measurements.         |
| Finishing before reviewing dimensions and constraints.     | Finishing before checking the measurements or any size conflicts. |

### How to fix it

| Before                                                                                    | Proposed                                                                                           |
| ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Use the five-part sequence to identify the first missed action, then continue from there. | Go through the sequence in the first hint. Find the first step you missed and continue from there. |
| Reopen the sketch if you need to correct geometry or dimensions.                          | If you already finished, open the sketch for editing to correct the shape or its measurements.     |

## Progress and evidence messages

Source: `LessonWorkspace.tsx and App.tsx`.

| Before                                                   | Proposed                                                           |
| -------------------------------------------------------- | ------------------------------------------------------------------ |
| Written lessons · Capture off                            | Written lesson · No screen capture                                 |
| No CAD work is being observed                            | Leqad can't see your drawing                                       |
| N steps completed · CAD work unverified                  | N of 8 steps marked complete · Work not checked                    |
| Acknowledgement only. No CAD operation has been checked. | Read this step, then click Got it.                                 |
| Instruction acknowledged. No CAD operation was checked.  | You clicked Got it.                                                |
| Not checked. Marking done records your report.           | Leqad can't check this step. Click Mark done when you've finished. |
| Marked done by you. CAD work has not been verified.      | You marked this step done. Leqad hasn't checked it.                |
| Paused. No observation running.                          | Lesson paused.                                                     |
| Local examples do not change progress.                   | Reading answers does not change your progress.                     |
| Return to Learn                                          | Back to lesson                                                     |
| Retry save                                               | Try saving again                                                   |

## Help labels and explanations

Source: `ContextualHelp.tsx`.

| Before                                                                                           | Proposed                                                                                                                             |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| Help + / Help −                                                                                  | Help + / Help − (unchanged)                                                                                                          |
| Hint                                                                                             | Hint (unchanged)                                                                                                                     |
| Detailed guidance                                                                                | Step details                                                                                                                         |
| Why it matters                                                                                   | Why it matters (unchanged)                                                                                                           |
| Common mistakes                                                                                  | Common mistakes (unchanged)                                                                                                          |
| Recovery                                                                                         | How to fix it                                                                                                                        |
| More help                                                                                        | Next hint                                                                                                                            |
| Select More help to reveal the first hint.                                                       | Click Next hint to see a hint.                                                                                                       |
| Unable to verify                                                                                 | Why can't Leqad check?                                                                                                               |
| Visual guidance for this control isn’t available yet.                                            | This desktop app can't see Onshape or highlight its tools.                                                                           |
| Follow the written steps. Marking done records your report; no selection or geometry is checked. | Follow the written steps in Onshape. Click Mark done when you've finished. Leqad records your choice; it does not check the drawing. |

## Local Ask prototype

Source: `AskLocal.tsx`.

| Before                                                                                                                                                    | Proposed                                                                                                                                                                                                         |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ask                                                                                                                                                       | Ask (unchanged)                                                                                                                                                                                                  |
| Local prototype · no AI connected                                                                                                                         | Local prototype · no AI                                                                                                                                                                                          |
| Ask local prototype (accessible label)                                                                                                                    | Ask prototype with example answers                                                                                                                                                                               |
| A sketch provides a flat profile for a later 3D feature.                                                                                                  | A sketch is a flat drawing that can become a 3D part later.                                                                                                                                                      |
| Step ${stepNumber} · ${step.id}                                                                                                                           | Step N of 8                                                                                                                                                                                                      |
| Why use Corner Rectangle?                                                                                                                                 | Why use Corner Rectangle? (unchanged)                                                                                                                                                                            |
| Corner Rectangle uses two opposite corners. It suits this lesson’s corner-based rectangular profile. Center Rectangle starts from a center point instead. | Corner Rectangle lets you draw by clicking two opposite corners. It is a simple choice for this lesson. Center Point Rectangle starts at the center instead. Use the Rectangle arrow to choose Corner Rectangle. |
| What can Leqad verify?                                                                                                                                    | Can Leqad check my drawing?                                                                                                                                                                                      |
| Visual inspection is unavailable in this build. Marking a step done records your report; it does not check the CAD interface or geometry.                 | No. This desktop app can't see Onshape or check your drawing. Mark done records that you say you finished a step.                                                                                                |
| Local example                                                                                                                                             | Example answer                                                                                                                                                                                                   |
| This explanation does not check your sketch.                                                                                                              | Click Back to lesson to follow the steps.                                                                                                                                                                        |
| Choose an authored example for this lesson.                                                                                                               | Choose a question to see an example answer.                                                                                                                                                                      |

## Completion

Source: `CompletionSummary.tsx`.

| Before                                                     | Proposed                                                     |
| ---------------------------------------------------------- | ------------------------------------------------------------ |
| Lesson completed                                           | Lesson complete                                              |
| N steps completed. CAD work is not independently verified. | N steps marked complete. Leqad has not checked your drawing. |
| Instruction acknowledged                                   | You clicked Got it                                           |
| Marked done by you · CAD work unverified                   | Marked done by you · Drawing not checked                     |
| Unable to verify                                           | Leqad couldn't check this step                               |
| Not completed                                              | Not done yet                                                 |
| Scroll to review all 8 steps.                              | Scroll to see all 8 steps.                                   |
| Review keeps progress. Restart requires confirmation.      | Reviewing keeps your progress. Restarting asks you first.    |
| Review steps                                               | Review steps (unchanged)                                     |
| End session                                                | Close Leqad                                                  |

## Loading, saved progress and restart

Source: `App.tsx and LessonWorkspace.tsx`.

| Before                                                                                                                                                                          | Proposed                                                                                                                                                                     |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Loading saved lesson and settings…                                                                                                                                              | Loading your lesson and settings...                                                                                                                                          |
| Settings could not be loaded. Default settings are in use.                                                                                                                      | We couldn't load your settings. Using default settings for now.                                                                                                              |
| Progress couldn’t be saved on this device.                                                                                                                                      | We couldn't save your progress. Try saving again before you close Leqad.                                                                                                     |
| Settings couldn’t be saved on this device.                                                                                                                                      | We couldn't save your settings. Your changes may be lost when you close Leqad.                                                                                               |
| Settings saved.                                                                                                                                                                 | Settings saved. (unchanged)                                                                                                                                                  |
| Continue Your First Sketch?                                                                                                                                                     | Continue Your First Sketch? (unchanged)                                                                                                                                      |
| Step N of 8 · N steps completed                                                                                                                                                 | Step N of 8 · N steps marked complete                                                                                                                                        |
| Saved lesson progress does not describe your current CAD model.                                                                                                                 | This is your saved lesson progress. Leqad hasn't checked your current drawing.                                                                                               |
| Resume lesson                                                                                                                                                                   | Resume lesson (unchanged)                                                                                                                                                    |
| Start again                                                                                                                                                                     | Start again (unchanged)                                                                                                                                                      |
| Saved progress couldn’t be read. You can continue with a fresh lesson in this session. The unreadable record is not cleared by this action.                                     | We couldn't read your saved progress. You can start fresh for now. This will not fix or erase the saved file.                                                                |
| Start fresh in this session                                                                                                                                                     | Start fresh for now                                                                                                                                                          |
| Start a fresh lesson in this session?                                                                                                                                           | Start fresh for now?                                                                                                                                                         |
| This starts fresh in the current session. It does not clear the unreadable saved record. New progress may fail to save; if it does, Leqad will show an error and let you retry. | This starts the lesson from step 1 for now. It won't fix or erase the saved file. New progress may not save. If saving fails, Leqad will show a message with a retry button. |
| Start fresh                                                                                                                                                                     | Start fresh (unchanged)                                                                                                                                                      |
| Start this lesson again?                                                                                                                                                        | Start this lesson again? (unchanged)                                                                                                                                         |
| Reset this lesson’s progress on this device?                                                                                                                                    | This clears your lesson progress on this device and starts at step 1.                                                                                                        |
| Reset lesson                                                                                                                                                                    | Restart lesson                                                                                                                                                               |
| Cancel                                                                                                                                                                          | Cancel (unchanged)                                                                                                                                                           |

## Settings and desktop status

Source: `Settings.tsx and App.tsx`.

| Before                                                                                      | Proposed                                                                                 |
| ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Visual access and recovery                                                                  | Screen access and panel position                                                         |
| Visual help isn’t available in this build. No window is selected and no capture is running. | This app can't capture the screen or highlight Onshape tools. No CAD window is selected. |
| Stop / revoke visual access                                                                 | Turn off screen access                                                                   |
| Change window                                                                               | Choose a CAD window                                                                      |
| Window selection isn’t available in this build.                                             | You can't choose a CAD window in this app.                                               |
| Reset panel position                                                                        | Reset panel position (unchanged)                                                         |
| Report misaligned highlight                                                                 | Report a misplaced highlight                                                             |
| No highlights are available to report.                                                      | This app can't highlight Onshape tools.                                                  |
| Appearance and accessibility                                                                | Display and text                                                                         |
| System                                                                                      | Use Windows setting                                                                      |
| Keep panel visible on top                                                                   | Keep Leqad on top                                                                        |
| Follow Windows                                                                              | Use Windows setting                                                                      |
| Visual access is off. Written lessons remain available.                                     | Screen access is off. You can still follow the written lesson.                           |
| Visual access could not be updated. Written lessons remain available.                       | We couldn't update screen access. You can still follow the written lesson.               |
| Panel position can only be reset by the desktop window.                                     | Open the desktop app to reset its window position.                                       |
| Panel position reset. The CAD window was not moved.                                         | Leqad panel position reset.                                                              |
| Panel position couldn’t be reset. Use the window’s Move command.                            | We couldn't reset the panel position. Try moving the Leqad window yourself.              |

## Labels and unreachable states that stay unchanged

Keep Learn, Ask, Settings, Your First Sketch, Got it, Mark done, Next step, Back, Pause, Resume, Back to lesson, Back to Ask, Restart lesson in the menu, Light, Dark, Appearance, Text size, Reduce motion, and the four percentage choices. These labels are already short and clear. Keep the window title `Leqad · Written Lessons` and internal diagnostic errors unchanged.

The summary has existing `UI_VERIFIED` and `MODEL_VERIFIED` labels and a conditional checked-results message. Those outcomes are unavailable in this milestone. Leave their wording and branches unchanged; do not enable them or create a screenshot that implies they can occur. The desktop's existing recorded outcomes remain two acknowledgements and six self-reports. Acknowledgement copy says only that the user clicked Got it, not that Leqad knows they read or understood the text. Completion remains lesson completion, not a checked CAD result.

Apply count-sensitive grammar to the existing count messages, such as `1 of 8 steps marked complete` and `2 of 8 steps marked complete`. Do not change how counts are calculated. The Ask step label becomes `Step N of 8`; this changes only visible text, not the internal step ID or saved state.

## Accuracy decisions

- The shared Top-plane explanation says Leqad can observe a selected control. The shared Sketch explanation says it checks interface state. Neither is true for this desktop build. The desktop wording describes what the learner should do and inspect.
- The shared fifth Top-plane hint directs the learner to Show me. This desktop has no working Show me action. The replacement directs the learner to the known list on the left and states the limitation briefly.
- Leqad's local Ask answer currently says Center Rectangle while the shared lesson says Center Point Rectangle. The proposal uses the shared curriculum's Center Point Rectangle name consistently and does not enable any variant recognition.
- Top in the feature list and Top view are different controls. Keep that distinction. Default geometry is a known visible heading from prior owner evidence; this wording does not assert a DOM hierarchy or introduce a selector.
- Do not describe Finish sketch as the same as Cancel. Choosing Finish sketch leaves editing and keeps the drawing; it does not independently check that the requested rectangle or measurements exist.
- The Step 4 explanation compares variants, but the main instruction names only Corner Rectangle. It retains both opposite-corner clicks. Dimensions stay in Step 5.
- The Step 5 text explains exact sizes as the sizes the learner wants Onshape to keep. It asks the learner to read the values; it does not report them as observed or verified by Leqad.
- Ask keeps one clear answer about what Leqad can check. Its extra helper line points back to the lesson rather than repeating the same warning.
- The first example question remains a local authored answer. The visible prototype/no-AI label stays explicit. No prompt entry, generated answer, network request, CAD observation or automation is proposed.

## Implementation and validation after approval

1. Add only the approved desktop presentation wording. Preserve the shared lesson definition and metadata byte-for-byte. Preserve state transitions, hint progression, completion modes and stored progress.
2. Use the same desktop copy for the step view, Help, Ask context and completion summary. Preserve all existing regions, controls, conditions, focus handling and scroll behavior. Do not duplicate lesson rules.
3. Update wording assertions in affected desktop tests. Add focused assertions for all eight copy entries, all five hints, Corner Rectangle selection and two clicks, 40 mm / 30 mm, flat-versus-solid explanation, honest evidence labels, and absence of unavailable Show me or AI promises. Preserve behavioral regressions.
4. Run affected component and native Electron tests. Exercise every step's instructions, all Help topics and hint levels, both Ask answers, error/restart text, Settings and Completion at 320 × 400 with 200% text. Check actual text/control bounds, keyboard reachability, focus and the existing one-scroller fallback. Also check 365 × 600 and existing text-size regressions.
5. Run formatting, lint, typecheck and relevant CI, including Windows Electron tests. Capture and inspect updated screenshots. If approved copy cannot fit using the existing scrolling layout, report the specific issue rather than silently changing the design or shrinking text.
6. Keep PR #19 draft, open and unmerged. Do not begin Milestone 2. Owner approval of this document authorizes only the accepted copy changes and their regression checks.

Two independent copy reviews checked the learning objectives, command names, beginner clarity, acknowledgement/self-report distinction and shared-code boundary. Revisions clarify that progress counts are marked complete, not CAD verification, and avoid promising unavailable features with the word "yet."

No implementation or tests have been run for this proposal. Only this review document is being prepared for approval.
