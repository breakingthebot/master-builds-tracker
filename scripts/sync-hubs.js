const fs = require('fs');
const { execSync } = require('child_process');

const REPOS_TO_SYNC = [
    { name: '286-builds', path: '286-builds/builds.json' },
    { name: '286-builds-dashboard', path: '286-builds-dashboard/data/builds.json' }
];

const GITHUB_API_URL = 'https://api.github.com/users/breakingthebot/repos?per_page=100';

console.log("Fetching public repositories...");
const reposData = JSON.parse(execSync(`curl -s "${GITHUB_API_URL}"`).toString());
const publicRepos = reposData.filter(r => r.visibility === 'public');

console.log("Loading tracker data...");
const tracker286 = JSON.parse(fs.readFileSync('src/data/projects_286.json', 'utf8'));

for (const repo of REPOS_TO_SYNC) {
    console.log(`Cloning ${repo.name}...`);
    execSync(`git clone https://${process.env.HUB_SYNC_PAT}@github.com/breakingthebot/${repo.name}.git`);
}

function updateBuildsFile(file) {
    console.log(`Processing ${file}...`);
    let existingBuilds = JSON.parse(fs.readFileSync(file, 'utf8'));
    const existingIds = new Set(existingBuilds.map(b => b.build_number));

    const mappings = {
        22: 'hammerspoon-config',
        23: 'server-setup-script',
        24: 'portfolio-site',
        25: 'flavorfind-recipe-finder',
        26: 'react-zustand-shopping-cart',
        27: 'github-dashboard-react-query',
        28: 'nextjs-blog-platform',
        30: 'remix-todo-build30',
        31: 'expense-tracker-build31',
        32: 'syllabus-viewer-build32',
        33: 'admin-panel-build33',
        34: 'realtime-search-rxjs'
    };

    const newBuilds = [];
    for (const [idStr, repoName] of Object.entries(mappings)) {
        const buildNum = parseInt(idStr);
        if (existingIds.has(buildNum)) continue;
        
        const r = publicRepos.find(repo => repo.name === repoName);
        const t = tracker286.find(entry => entry.id === buildNum);
        
        if (r && t) {
            let cat = t.category || "Unknown";
            if (cat.includes("Frontend - Angular") || cat.includes("Frontend") || cat.includes("CSS & Styling")) cat = "Web Frontend";
            if (cat.includes("Backend")) cat = "Backend & Networking";
            if (cat.includes("Languages")) cat = "Libraries & Packages";
            
            newBuilds.push({
                build_number: buildNum,
                date: r.created_at.slice(0, 10),
                project_name: t.description.split('—')[0].trim() || r.name,
                description: t.description || r.description,
                repo_url: r.html_url,
                technology: t.technology || "Unknown",
                category: cat,
                stack: [t.technology, cat].filter(Boolean),
                depth: "Expanded",
                notes: t.notes || ""
            });
            existingIds.add(buildNum);
        }
    }

    for (const r of publicRepos) {
        const match = r.name.match(/build(\d+)$/);
        if (match) {
            const buildNum = parseInt(match[1]);
            if (existingIds.has(buildNum)) continue; 
            
            const t = tracker286.find(entry => entry.id === buildNum);
            if (t) {
                let cat = t.category || "Unknown";
                if (cat.includes("Frontend - Angular") || cat.includes("Frontend") || cat.includes("CSS & Styling")) cat = "Web Frontend";
                if (cat.includes("Backend")) cat = "Backend & Networking";
                if (cat.includes("Languages")) cat = "Libraries & Packages";

                newBuilds.push({
                    build_number: buildNum,
                    date: r.created_at.slice(0, 10), 
                    project_name: t.description.split('—')[0].trim() || r.name,
                    description: t.description || r.description,
                    repo_url: r.html_url,
                    technology: t.technology || "Unknown",
                    category: cat,
                    stack: [t.technology, cat].filter(Boolean),
                    depth: "Expanded",
                    notes: t.notes || ""
                });
                existingIds.add(buildNum);
            }
        }
    }

    existingBuilds = existingBuilds.concat(newBuilds);
    
    // Fix existing invalid categories/depths
    for (const b of existingBuilds) {
        if (b.depth === "Standard") {
            b.depth = "Expanded";
        }
        if (b.category.includes("Frontend - Angular") || b.category.includes("Frontend")) {
            b.category = "Web Frontend";
            b.stack[1] = "Web Frontend";
        }
    }

    existingBuilds.sort((a, b) => b.build_number - a.build_number);
    fs.writeFileSync(file, JSON.stringify(existingBuilds, null, 2) + "\n");
    console.log(`Updated ${file} with ${newBuilds.length} new builds.`);
    return newBuilds.length > 0;
}

let hasChanges = false;
for (const repo of REPOS_TO_SYNC) {
    const fileChanged = updateBuildsFile(repo.path);
    if (fileChanged) {
        hasChanges = true;
        console.log(`Committing changes in ${repo.name}...`);
        try {
            execSync(`cd ${repo.name} && git config user.email "bot@breakingthebot.com" && git config user.name "Tracker Sync Bot"`);
            execSync(`cd ${repo.name} && git add . && git commit -m "Automated metadata sync from master-builds-tracker"`);
        } catch (error) {
            console.error(`Failed to commit changes to ${repo.name}:`, error.message);
        }
    } else {
        console.log(`No new builds to sync for ${repo.name}.`);
    }
}
