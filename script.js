let followers = [], following = [], nonFollowers = [];

document.getElementById('loadBtn').onclick = loadZip;
document.getElementById('close').onclick = () => modal.style.display = 'none';

function formatDuration(seconds) {
    seconds = Math.abs(seconds);
    if (seconds < 60) return seconds + ' seconds';
    if (seconds < 3600) return Math.floor(seconds / 60) + ' minutes';
    if (seconds < 86400) return Math.floor(seconds / 3600) + ' hours';
    return Math.floor(seconds / 86400) + ' days';
}

async function loadZip() {

    try {

        const loadBtn =
            document.getElementById("loadBtn");

        loadBtn.disabled = true;
        document
            .getElementById("loadText")
            .textContent = "Loading ZIP";

        document
            .getElementById("spinner")
            .classList
            .remove("hidden");

        const file =
            document.getElementById(
                "zipFile"
            ).files[0];

        if (!file) {

            loadBtn.disabled = false;

            document
                .getElementById("loadText")
                .textContent =
                "Load Instagram ZIP";

            document
                .getElementById("spinner")
                .classList.add("hidden");

            alert("Choose Instagram ZIP");
            return;
        }

        const zip =
            await JSZip.loadAsync(file);

        const files =
            Object.keys(zip.files);

        const hasFollowers =
            files.some(
                name =>
                    /followers_\d+\.json$/i
                        .test(name)
            );

        const hasFollowing =
            files.some(
                name =>
                    name.endsWith(
                        "following.json"
                    )
            );

        if (
            !hasFollowers ||
            !hasFollowing
        ) {

            throw new Error(
                "Not an Instagram export"
            );
        }

        followers = [];
        following = [];

        const fileNames =
            Object.keys(zip.files);

        for (
            let i = 0;
            i < fileNames.length;
            i++
        ) {

            const name =
                fileNames[i];

            if (i % 5 === 0) {

                await new Promise(
                    resolve =>
                        setTimeout(
                            resolve,
                            0
                        )
                );
            }
            if (/followers_\d+\.json$/i.test(name)) {
                const data = JSON.parse(await zip.files[name].async('string'));
                for (const item of data) {
                    const d = item.string_list_data?.[0];
                    if (d?.value) followers.push({
                        username: d.value,
                        timestamp: d.timestamp || 0,
                        href: d.href || ""
                    });
                }
            }

            if (name.endsWith("following.json")) {

                const raw =
                    await zip.files[name]
                        .async("string");

                const data =
                    JSON.parse(raw);

                (
                    data.relationships_following ||
                    []
                ).forEach(item => {

                    const info =
                        item.string_list_data?.[0];

                    const username =
                        info?.value ||
                        item.title ||
                        "";

                    if (username) {

                        following.push({
                            username,
                            timestamp: info?.timestamp || 0,
                            href: info?.href || ""
                        });

                    }

                });

            }
        }

        followers = [...new Map(followers.map(x => [x.username, x])).values()];
        following = [...new Map(following.map(x => [x.username, x])).values()];

        const followerSet = new Set(followers.map(x => x.username));
        nonFollowers = following.filter(x => !followerSet.has(x.username));

        if (
            followers.length === 0 &&
            following.length === 0
        ) {

            throw new Error(
                "Instagram data missing"
            );
        }

        followersCount.textContent = followers.length;
        followingCount.textContent = following.length;
        nonFollowersCount.textContent = nonFollowers.length;

        render();

        loadBtn.disabled = false;
        document
            .getElementById("loadText")
            .textContent =
            "Load Instagram ZIP";

        document
            .getElementById("spinner")
            .classList
            .add("hidden");

    } catch (err) {

        console.error(err);

        alert("Invalid or unsupported Instagram export ZIP.");

        document
            .getElementById(
                "loadText"
            )
            .textContent =
            "Load Instagram ZIP";

        document
            .getElementById(
                "spinner"
            )
            .classList.add(
                "hidden"
            );

        document
            .getElementById("loadBtn")
            .disabled = false;
    }
}

function render() {

    fill(
        "followersList",
        followers,
        "No followers found"
    );

    fill(
        "followingList",
        following,
        "No following found"
    );

    fill(
        "nonFollowersList",
        nonFollowers,
        "No non-followers found"
    );
}

function fill(
    id,
    data,
    emptyText
) {

    const ul =
        document.getElementById(id);

    ul.innerHTML = "";

    if (data.length === 0) {

        ul.innerHTML = `
            <li class="empty-state">
                ${emptyText}
            </li>
        `;

        return;
    }

    data.sort(
        (a, b) =>
            a.username.localeCompare(
                b.username
            )
    );

    for (const u of data) {

        const li =
            document.createElement(
                "li"
            );

        li.className =
            "user-item";

        li.innerHTML = `
            <span>
                👤 ${u.username}
            </span>

            <span>
                ›
            </span>
        `;

        li.onclick =
            () =>
                showDetails(
                    u.username
                );

        ul.appendChild(li);
    }
}

function showDetails(username) {

    const follower =
        followers.find(
            x => x.username === username
        );

    const followingUser =
        following.find(
            x => x.username === username
        );

    let relationship =
        "Unknown";

    if (
        follower &&
        followingUser
    ) {
        relationship =
            "Mutual";
    }
    else if (
        follower
    ) {
        relationship =
            "They Follow You";
    }
    else if (
        followingUser
    ) {
        relationship =
            "You Follow Them";
    }

    const safeUsername =
        username
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;");

    let html =
        `<h2>${safeUsername}</h2>`;

    html +=
        `<p><b>Relationship:</b> ${relationship}</p>`;

    if (follower) {

        html += `
            <p>
                <b>Followed You:</b>
                ${new Date(
            follower.timestamp * 1000
        ).toLocaleString()}
            </p>
        `;
    }

    if (followingUser) {

        html += `
            <p>
                <b>You Followed:</b>
                ${new Date(
            followingUser.timestamp * 1000
        ).toLocaleString()}
            </p>
        `;
    }

    if (
        follower &&
        followingUser
    ) {

        const diff =
            Math.abs(
                follower.timestamp -
                followingUser.timestamp
            );

        const whoFirst =
            follower.timestamp <
                followingUser.timestamp
                ? "They Followed First"
                : "You Followed First";

        html += `
            <p>
                <b>Who Followed First:</b>
                ${whoFirst}
            </p>
        `;

        html += `
            <p>
                <b>Follow Back Delay:</b>
                ${formatDuration(diff)}
            </p>
        `;
    }

    const profileUrl =
        follower?.href ||
        followingUser?.href ||
        "";

    if (profileUrl) {

        html += `
            <p>
                    <a href="${profileUrl}" target="_blank">View Profile ↗</a>
            </p>
        `;
    }

    details.innerHTML =
        html;

    modal.style.display = "flex";
}

search.addEventListener('input', e => {
    const q = e.target.value.toLowerCase();
    document
        .querySelectorAll(
            ".user-item"
        )
        .forEach(li => {

            li.style.display =
                li.textContent
                    .toLowerCase()
                    .includes(q)
                    ? ""
                    : "none";
        });
});

document
    .getElementById("clearBtn")
    .addEventListener(
        "click",
        () => {

            search.value = "";

            document
                .querySelectorAll(
                    ".user-item"
                )
                .forEach(
                    item =>
                        item.style.display = ""
                );

        }
    );

window.addEventListener(
    "click",
    event => {

        if (
            event.target === modal
        ) {

            modal.style.display =
                "none";
        }

    }
);

document
    .getElementById(
        "exportBtn"
    )
    .addEventListener(
        "click",
        exportNonFollowers
    );

function exportNonFollowers() {

    if (
        nonFollowers.length === 0
    ) {

        alert(
            "No non-followers found."
        );

        return;
    }

    const content =
        nonFollowers
            .map(
                user =>
                    user.username
            )
            .join("\n");

    const blob =
        new Blob(
            [content],
            {
                type:
                    "text/plain"
            }
        );

    const url =
        URL.createObjectURL(
            blob
        );

    const a =
        document.createElement(
            "a"
        );

    a.href = url;

    a.download =
        "non_followers.txt";

    document.body
        .appendChild(a);

    a.click();

    a.remove();

    URL.revokeObjectURL(
        url
    );
}