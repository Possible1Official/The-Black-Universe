# Mission navigation

A navigation card appears while actively exploring and hides during dialogue or pause. Its compass shows the viewing heading; the arrow points toward the current waypoint relative to that heading, with Ahead / Left / Right / Behind and horizontal distance in meters. North is local negative Z (toward Erebus's bow); east is positive X. On Nysa these are survey-site axes, not geographic planetary coordinates. Distance is displacement to the current waypoint, not total route length or elevation-aware walking distance.

Ship guidance advances through navigation, engineering and observatory relays, then the forge and science array. A containment trip prioritizes engineering diagnostics. If all relays are restored but routing/heat prevents initial genesis, diagnostics also takes priority. Existing completed saves go directly to the science array. No navigation data changes the save schema or progression.

Crossing between ship rooms uses scripted access-panel/doorway waypoints. A closed destination bulkhead points to its panel; an open bulkhead points first to the passage, then the room entrance. Leaving a side room points through its doorway into the habitat; approaching an occupied closed door triggers the existing safety release. Starboard and port panels have distinct guide labels. Final consoles still require approaching, facing and interacting with E. Guidance does not open doors or activate anything automatically.

On Nysa the guide points to the luminous outcrop until sampling, then switches to the extraction beacon. It never guides from the surface toward a ship coordinate. Extraction restores ship guidance; reloading retains survey progress and starts with ship guidance aboard.

Updates are capped at ten per second and create no scene geometry, raycasts, texture assets, network requests or dependencies. The card does not capture pointer input. Small touch viewports collapse mission detail and the ambient power card to keep guidance clear of the joystick and E button; reactor warnings still appear in the system header and diagnostics retains its controls.

Limits: scripted routing for the current room layout, not general pathfinding, collision avoidance or an autopilot. Steer around rocks, crew and furniture. A doorway waypoint can be shown while its bulkhead is still physically opening. There is no minimap, planetary map, offscreen world marker or NPC navigation graph. Hardware performance/accessibility with a screen reader remains unverified; this card supplements the existing visual first-person controls.
