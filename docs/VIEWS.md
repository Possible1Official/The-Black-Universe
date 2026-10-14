# Clear view and third person

Information panels start hidden on a new browser. **INFO** (or H) shows/hides mission, power, navigation, telemetry, contextual prompts, notifications and location together. The pause button, movement joystick, interaction button and flight Brake/Boost/Target buttons remain accessible. Deliberately opened conversations, power controls and field logs remain visible so their controls can be used. J still opens the field log with panels hidden.

**1P / 3P** (or C) switches the walking and flight camera. These two browser-local preferences are independent of mission saves and survive reload; mission reset does not reset them. Storage failures leave session preferences usable. Keyboard shortcuts are available during active exploration, not inside a dialogue/settings form.

Walking third person uses an independent clone of the existing licensed Ely skin, sharing geometry, textures and download with the two officers. Idle/Walking blend follows actual Rapier displacement. Jumping moves the avatar with the physical capsule but has no dedicated jump/run clip or IK. The small procedural fallback remains if loading fails. A .22-meter sphere sweep retracts the shoulder camera against physical walls/doors/terrain; the avatar disappears below .8 meters of camera clearance to avoid filling the screen. Interaction distance and sight are measured from the character's eye with the existing aim direction in either view; the offset camera does not grant extra reach or see-through-wall interaction.

Flight third person displays the uploaded craft behind a chase camera; first person retains the existing generated cockpit. Orbital camera clearance uses the hangar/habitat envelopes and planet sphere. Guided surface flight keeps the craft level and uses terrain/prop ray clearance. Extremely close vehicle-camera contact hides the craft rather than showing its interior. Vehicle collision remains the existing conservative assisted-flight model, not detailed rigid-body wing contact. The guided descent/ascent and complete launch/land/walk/board/dock loop are preserved.

The parked craft's 4.94×2.84×6.62-meter collision envelope covers the imported wings/body. Its aft hatch and navigation anchor sit 3.5 meters behind the craft center, outside the hull, so boarding remains reachable from the rear and blocked through the ship. This is a conservative box, not per-triangle contact.

The imported station forms the elevated exterior habitat assembly above the working docking bay. The existing walkable mission rooms and tested open bay remain procedural. Its hollow-looking sections have a conservative box collision envelope; imported rooms are not independently walkable in this release. See ASSETS.md for source and optimization evidence.

Validation scripts: `node scripts/view-qa.mjs` against development checks both camera modes, panels, wall recovery, local preferences, shared asset requests, third-person flight round trip and portrait/landscape control bounds. `node scripts/flight-production-qa.mjs` against the production preview now runs the actual walking/piloting round trip with third-person selected. Software-renderer checks do not establish hardware/mobile FPS or real pointer-lock behavior.


The 2026-10-14 expansion supersedes the earlier appearance/flight-camera notes: Cyber Biker is the player, selected CGTrader ship/cockpit replace the craft view, and speed/steering controls remain visible with INFO off. Third-person free look is independent of pilot/ground-vehicle heading. See VEHICLES.md for exact animation/collision limits.
