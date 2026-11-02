# Pending - everything still open

"Who": **Owner** = only the owner can do it (signing in, passwords, firewall, DNS, deploys he must run, real-world tests with real people). **Code** = a developer or AI assistant can do it in code. **Owner + code** = both are needed.

## Login and Home
| Item | Who |
|---|---|
| Confirm one real staff sign-in end to end after the 30-31 Oct login fixes | Owner |
| Resolve the "login still not working" report: get a screenshot with the address bar (old HR site, an in-app login or the .exe?) | Owner |
| One real clock-in from a real account on a real phone (camera, selfie, location) | Owner |
| Back up JASPREET's data regularly (`limelight-workspace\Data`, `limelight-office\data`, Studio `Projects/`, `Library/`) - no backup routine exists | Owner + code |

## Chats
| Item | Who |
|---|---|
| Optional: move chat files and profile photos to the NAS | Owner decides, then code |

## Create and Library
| Item | Who |
|---|---|
| Text-to-video engine (Wan 2.2 5B or LTX-Video on NAYA B) - currently stopped by the owner | Owner decides, then code |
| Ideas: "Send to Design" for AI images, AI video → Edit timeline, Brand Kit, image edit / background removal, voice-over | Owner decides |
| Test Library's Download button and phone layout live | Owner (or code with a real account) |

## Profile
| Item | Who |
|---|---|
| Check the admin Time board and admin views with real admin data | Owner |

## Edit
| Item | Who |
|---|---|
| Test the standby on NAYA B with the workspace key; confirm B's standby has the 53-person Edit team list | Owner |
| Confirm NAYA A is healthy after the 29 Oct outage and B has left standby | Owner |
| Confirm the project-tabs fix (`framedByOther`) is committed and in the live release, or drop it (the workspace proxy already covers it) | Code, deploy by Owner |
| Staff PCs: replace the old editor app 1.4 with Lighthouse.exe | Owner |
| Free DaVinci Resolve needs one click per PC (Workspace → Scripts → Limelight Timeline) | Owner / staff |

## Design
| Item | Who |
|---|---|
| Open exported CDR/AI in Illustrator and PSDs in real Photoshop to check them | Owner |
| Delete the 3 broken "remove" layers in the owner's poster and the test designs ("Tabs test", "Instagram Post", "Big Announcement") | Owner |
| Better generative fill: install the inpaint route on NAYA B (bigger GPU) | Code, deploy by Owner |
| Re-test bottom tabs and live editing after the generative-fill rewrite; test the Color tab in the workspace and on other PCs | Code |
| Not built: AI background removal, Magic Write, Magic Edit, adjustment layers, Liquify, undo for crop | Owner decides |

## Office
| Item | Who |
|---|---|
| Link the owner's Office account to the HR email once (Office setup → My account) | Owner |
| Check Salary Approve buttons, OT numbers, admin Home and OT team view with an owner login; check Salary against real payroll | Owner |
| Click-test status changes, Approve and Quick task on the new Tasks/Home pages (they write live HR data) | Owner |
| Real camera call between two PCs; Share between two real staff | Owner |
| Agent tools with a real model on NAYA B | Code + Owner |
| Rebuild in the new pages: assigning tasks to others, timers, adding/editing projects | Code |
| Allow firewall ports 3443 and 3444 on JASPREET for team PCs | Owner |
| Decide whether to edit the HR app's own code (needs explicit yes; it deploys live) | Owner |

## Limelight AI
| Item | Who |
|---|---|
| Fix the AI footer name in the AI's own frontend (outside the workspace) | Code, deploy by Owner |
| JASPREET's local AI has no `data\workspace.key` (checked 31 Oct), so when the workspace falls back to it, people may see its unlock screen. Copy `Data\ai.key` there (Design's inpainting is not affected) | Code |
| Confirm the "Ollama LAN" firewall rule and `OLLAMA_HOST` are gone on NAYA B | Owner |
| Make the password copy on JASPREET match B's file (or delete it) | Owner |
| Vision model sometimes answers Hinglish in English | Code |
| Not built: document search, skill playbooks, memory, calculator/date tools; video routes on B | Owner decides |
| Bigger model (gpt-oss-120b) needs RAM/hardware | Owner decides |

## Phone, speed and app
| Item | Who |
|---|---|
| Test the phone layout with a real finger, typing and saving on a real phone | Owner |
| Press "Install" on a real phone and Mac | Owner |

## Servers
| Item | Who |
|---|---|
| Confirm the old quick tunnels (`*.trycloudflare.com`, "LimelightTunnel") are stopped | Owner |
| Reserve .210, .200 and .205 on the router (Lighthouse.exe uses .210) | Owner |
| Collect specs and network speed of the other PCs | Owner |
| Delete the empty `.dirtest` folder in `Z:\Limelight Storage` on the NAS | Owner |
| Finish MeshLink VPN (client setup, router forwarding) or drop it | Owner |
| Optional upgrades: RAM for NAYA B, bigger GPU or Mac Studio | Owner decides |
| Confirm which editor link staff use (`editor.limelightcorp.in` in the editor README vs `editor.limelightcorp.net` on the tunnel) | Owner |

## Housekeeping in this repo
| Item | Who |
|---|---|
| The Office key path is hard-coded (`E:/Limelight Ai/limelight-office/data/workspace.key` in `server/areas/office.mjs`) and so is the Office address (`127.0.0.1:3300`); a move to another drive needs a code change | Code |

## Owner actions from the 31 Oct test

| Item | Who |
|---|---|
| Remove `Ollama.lnk` from JASPREET's Startup folder once the AI engine (8830) has run well for a few days (`start-all.vbs` is already there and worked at sign-in on 1 Nov) | Owner |
| Cloudflare: Caching -> Configuration -> Browser Cache TTL -> "Respect Existing Headers" (now 4 hours, it overrides the server's "always check" for files without a version stamp, e.g. `sw.js`) | Owner |
| JASPREET is still the only PC serving limelightcorp.net: a real standby would need Lighthouse on NAYA B with Data kept in sync and a second tunnel connector | Owner + code |
| Test the Office "Leave without saving?" pop-up after real edits, and the installable app with Install on a real phone | Owner |

| Copy the new `dist\Lighthouse - doosre PC ke liye.zip` (English read-me) to the NAS where staff get Lighthouse.exe | Owner |
| The old Lighthouse site (lighthouse.limelightcorp.in) is closed to direct visits since 2 Nov - reopen by deleting the TEMPORARY script in `D:\LimelightWebapp\src\app\layout.js` (pushes to main go live in ~2 min) | Owner decides |
