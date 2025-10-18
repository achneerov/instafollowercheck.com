// Global file storage
let leftFiles = [];
let rightFiles = [];

// Hidden profiles management
const HIDDEN_PROFILES_KEY = 'instafollowercheck_hidden_profiles';

function getHiddenProfiles() {
  const stored = localStorage.getItem(HIDDEN_PROFILES_KEY);
  return stored ? JSON.parse(stored) : [];
}

function hideProfile(username) {
  const hidden = getHiddenProfiles();
  if (!hidden.includes(username)) {
    hidden.push(username);
    localStorage.setItem(HIDDEN_PROFILES_KEY, JSON.stringify(hidden));
  }
}

function unhideProfile(username) {
  const hidden = getHiddenProfiles();
  const filtered = hidden.filter(u => u !== username);
  localStorage.setItem(HIDDEN_PROFILES_KEY, JSON.stringify(filtered));
}

function isProfileHidden(username) {
  return getHiddenProfiles().includes(username);
}

function handleMultipleFileUpload(side) {
  const fileInput = document.getElementById(side + "Upload");
  const filesList = document.getElementById(side + "FilesList");
  const compareButton = document.getElementById("compareButton");

  // Add newly selected files to our collection
  if (fileInput.files.length > 0) {
    // Get the appropriate files array based on side
    const filesArray = side === "left" ? leftFiles : rightFiles;

    // Add each file to the array and create visual elements
    for (let i = 0; i < fileInput.files.length; i++) {
      const file = fileInput.files[i];

      // Only add if not already in the array (check by name to simplify)
      if (!filesArray.some((f) => f.name === file.name)) {
        filesArray.push(file);

        // Create file icon/element
        const fileElement = document.createElement("div");
        fileElement.classList.add(
          "flex",
          "items-center",
          "bg-white",
          "p-2",
          "rounded",
          "border",
          "border-gray-300",
          "mb-2",
        );

        // File icon
        const iconSpan = document.createElement("span");
        iconSpan.innerHTML = "📄";
        iconSpan.classList.add("mr-2");

        // File name (truncated if too long)
        const nameSpan = document.createElement("span");
        const displayName =
          file.name.length > 15
            ? file.name.substring(0, 12) + "..."
            : file.name;
        nameSpan.textContent = displayName;
        nameSpan.title = file.name; // Full name on hover
        nameSpan.classList.add("text-sm");

        // Remove button
        const removeButton = document.createElement("button");
        removeButton.innerHTML = "✖";
        removeButton.classList.add(
          "ml-2",
          "text-red-500",
          "hover:text-red-700",
        );
        removeButton.title = "Remove file";
        removeButton.onclick = function () {
          // Remove from array
          const index = filesArray.findIndex((f) => f.name === file.name);
          if (index !== -1) {
            filesArray.splice(index, 1);
          }

          // Remove visual element
          fileElement.remove();

          // Update compare button state
          updateCompareButtonState();
        };

        // Assemble file element
        fileElement.appendChild(iconSpan);
        fileElement.appendChild(nameSpan);
        fileElement.appendChild(removeButton);

        // Add to the files list
        filesList.appendChild(fileElement);
      }
    }

    // Reset the file input to allow selecting the same files again if needed
    fileInput.value = "";
  }

  updateCompareButtonState();
}

function updateCompareButtonState() {
  const compareButton = document.getElementById("compareButton");

  if (leftFiles.length > 0 && rightFiles.length > 0) {
    compareButton.classList.remove("bg-gray-500", "cursor-not-allowed");
    compareButton.classList.add("bg-green-500", "hover:bg-green-600");
    compareButton.disabled = false;
  } else {
    compareButton.classList.remove("bg-green-500", "hover:bg-green-600");
    compareButton.classList.add("bg-gray-500", "cursor-not-allowed");
    compareButton.disabled = true;
  }
}

function compareFiles() {
  const resultDiv = document.getElementById("who_doesnt_follow_back");

  if (leftFiles.length === 0 || rightFiles.length === 0) {
    alert("Please select JSON files for both followers and following.");
    return;
  }

  // Initialize arrays to store all user data
  let allFollowers = [];
  let allFollowing = [];

  // Process all follower files
  processFiles(leftFiles, allFollowers, () => {
    // After processing followers, process all following files
    processFiles(rightFiles, allFollowing, () => {
      // After processing all files, perform the comparison
      compareUsersAndDisplayResults(allFollowers, allFollowing);
    });
  });
}

function processFiles(files, accumulator, callback) {
  let filesProcessed = 0;

  files.forEach((file) => {
    const reader = new FileReader();

    reader.onload = function (e) {
      try {
        const data = JSON.parse(e.target.result);

        // Extract usernames from the data structure
        // Check if this is a following.json file with relationships_following structure
        if (data.relationships_following) {
          // Process relationships_following structure
          data.relationships_following.forEach((item) => {
            if (item.title) {
              accumulator.push({
                username: item.title,
                timestamp: item.string_list_data?.[0]?.timestamp || null,
                href: item.string_list_data?.[0]?.href || null,
              });
            }
          });
        } else {
          // Process standard array structure (followers)
          data.forEach((item) => {
            if (
              item.string_list_data &&
              item.string_list_data[0] &&
              item.string_list_data[0].value
            ) {
              accumulator.push({
                username: item.string_list_data[0].value,
                timestamp: item.string_list_data[0].timestamp || null,
                href: item.string_list_data[0].href || null,
              });
            }
          });
        }
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error);
        alert(
          `Error processing file ${file.name}. Please make sure it's a valid JSON file from Instagram.`,
        );
      }

      filesProcessed++;
      if (filesProcessed === files.length) {
        callback();
      }
    };

    reader.readAsText(file);
  });
}

function compareUsersAndDisplayResults(followerList, followingList) {
  const resultDiv = document.getElementById("who_doesnt_follow_back");

  // Get hidden profiles
  const hiddenProfiles = getHiddenProfiles();

  // Create maps for quick lookup with all data
  const followersMap = new Map();
  followerList.forEach((item) => {
    if (!followersMap.has(item.username)) {
      followersMap.set(item.username, item);
    }
  });

  const followingMap = new Map();
  followingList.forEach((item) => {
    if (!followingMap.has(item.username)) {
      followingMap.set(item.username, item);
    }
  });

  // Find users you follow who don't follow you back
  const notFollowingBackListAll = [];
  const notFollowingBackListHidden = [];
  followingMap.forEach((followingUser, username) => {
    if (!followersMap.has(username)) {
      if (isProfileHidden(username)) {
        notFollowingBackListHidden.push(followingUser);
      } else {
        notFollowingBackListAll.push(followingUser);
      }
    }
  });

  // Find mutual followers with who followed first data
  const mutualFollowersListAll = [];
  const mutualFollowersListHidden = [];
  followingMap.forEach((followingUser, username) => {
    if (followersMap.has(username)) {
      const followerUser = followersMap.get(username);
      const mutualData = {
        username: username,
        youFollowedTimestamp: followingUser.timestamp,
        theyFollowedTimestamp: followerUser.timestamp,
        href: followingUser.href,
      };
      if (isProfileHidden(username)) {
        mutualFollowersListHidden.push(mutualData);
      } else {
        mutualFollowersListAll.push(mutualData);
      }
    }
  });

  // Display summary statistics
  const statsDiv = document.createElement("div");
  statsDiv.classList.add("mb-6", "text-center");

  const totalHidden = notFollowingBackListHidden.length + mutualFollowersListHidden.length;
  const hiddenText = totalHidden > 0 ? `<p class="text-sm text-gray-600 mt-2">${totalHidden} profile${totalHidden !== 1 ? 's' : ''} hidden</p>` : '';

  statsDiv.innerHTML = `
        <p class="text-lg mb-2">
            <b>Total followers:</b> ${followersMap.size} |
            <b>Total following:</b> ${followingMap.size}
        </p>
        <p class="text-lg mb-4">
            <b>Users not following you back:</b> ${notFollowingBackListAll.length}
            (${followingMap.size > 0 ? Math.round((notFollowingBackListAll.length / followingMap.size) * 100) : 0}%)
        </p>
        <p class="text-lg mb-4">
            <b>Mutual followers:</b> ${mutualFollowersListAll.length}
        </p>
        ${hiddenText}
    `;

  resultDiv.innerHTML = "";
  resultDiv.appendChild(statsDiv);

  // Create and display the not following back table
  displayNotFollowingBackTable(notFollowingBackListAll, resultDiv);

  // Create and display the mutual followers table
  displayMutualFollowersTable(mutualFollowersListAll, resultDiv);

  // Create and display the hidden profiles section
  displayHiddenProfilesSection(notFollowingBackListHidden, mutualFollowersListHidden, resultDiv);
}

// Helper function to format timestamp to readable date
function formatDate(timestamp) {
  if (!timestamp) return "Unknown";
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// Helper function to calculate days ago
function daysAgo(timestamp) {
  if (!timestamp) return "Unknown";
  const now = new Date();
  const then = new Date(timestamp * 1000);
  const diffTime = Math.abs(now - then);
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return `${diffDays} days ago`;
}

// Helper function to format time delta between two timestamps
function formatTimeDelta(timestamp1, timestamp2) {
  if (!timestamp1 || !timestamp2) return "Unknown";

  const diffSeconds = Math.abs(timestamp2 - timestamp1);
  const diffDays = Math.floor(diffSeconds / (60 * 60 * 24));
  const diffHours = Math.floor(diffSeconds / (60 * 60));
  const diffMinutes = Math.floor(diffSeconds / 60);

  if (diffDays > 0) {
    return `${diffDays} day${diffDays !== 1 ? 's' : ''}`;
  } else if (diffHours > 0) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''}`;
  } else if (diffMinutes > 0) {
    return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''}`;
  } else {
    return "less than a minute";
  }
}

function displayNotFollowingBackTable(notFollowingBackList, resultDiv) {
  // Section header
  const sectionHeader = document.createElement("h2");
  sectionHeader.classList.add(
    "text-2xl",
    "font-bold",
    "text-center",
    "mt-8",
    "mb-4",
  );
  sectionHeader.textContent = "Who Doesn't Follow You Back";
  resultDiv.appendChild(sectionHeader);

  // If there are no results, show a message
  if (notFollowingBackList.length === 0) {
    const noResultsDiv = document.createElement("div");
    noResultsDiv.classList.add(
      "p-6",
      "bg-gray-50",
      "shadow-md",
      "rounded-md",
      "border",
      "border-gray-300",
      "my-8",
      "mx-auto",
      "text-center",
    );
    noResultsDiv.innerText =
      "Great news! Everyone you follow is following you back!";
    resultDiv.appendChild(noResultsDiv);
    return;
  }

  // Sort by oldest follow by default
  const sortedList = [...notFollowingBackList].sort(
    (a, b) => (a.timestamp || 0) - (b.timestamp || 0),
  );

  // Create table wrapper with controls
  const tableWrapper = document.createElement("div");
  tableWrapper.classList.add(
    "p-6",
    "bg-gray-50",
    "shadow-md",
    "rounded-md",
    "border",
    "border-gray-300",
    "my-8",
    "mx-auto",
    "overflow-x-auto",
  );
  tableWrapper.style.maxWidth = "95%";

  // Add sort controls
  const sortControls = document.createElement("div");
  sortControls.classList.add("mb-4", "text-center");
  sortControls.innerHTML = `
    <label class="mr-2 font-semibold">Sort by:</label>
    <select id="sortNotFollowingBack" class="px-3 py-1 border rounded">
      <option value="oldest">Oldest Follow</option>
      <option value="recent">Most Recent Follow</option>
      <option value="username">Username (A-Z)</option>
    </select>
  `;
  tableWrapper.appendChild(sortControls);

  // Create table
  const table = document.createElement("table");
  table.classList.add("w-full", "text-left", "border-collapse");
  table.id = "notFollowingBackTable";

  // Create header
  const thead = document.createElement("thead");
  const headerRow = thead.insertRow();
  const headers = ["#", "Username", "You Followed", "Profile", "Actions"];

  headers.forEach((headerText) => {
    const th = document.createElement("th");
    th.textContent = headerText;
    th.classList.add(
      "px-4",
      "py-2",
      "bg-blue-500",
      "text-white",
      "font-semibold",
      "text-center",
      "border",
    );
    headerRow.appendChild(th);
  });

  table.appendChild(thead);

  // Create tbody
  const tbody = document.createElement("tbody");
  tbody.id = "notFollowingBackTableBody";

  function renderTableRows(list) {
    tbody.innerHTML = "";
    list.forEach((user, index) => {
      const row = tbody.insertRow();

      // Number
      const cell1 = row.insertCell();
      cell1.textContent = index + 1;
      cell1.classList.add("px-4", "py-2", "border", "text-center");

      // Username
      const cell2 = row.insertCell();
      cell2.textContent = user.username;
      cell2.classList.add("px-4", "py-2", "border", "text-center");

      // Days ago
      const cell3 = row.insertCell();
      cell3.textContent = daysAgo(user.timestamp);
      cell3.classList.add("px-4", "py-2", "border", "text-center");

      // Profile link
      const cell4 = row.insertCell();
      const link = document.createElement("a");
      link.href = user.href || `https://www.instagram.com/${user.username}`;
      link.target = "_blank";
      link.textContent = "View Profile";
      link.classList.add("text-blue-600", "hover:underline");
      cell4.appendChild(link);
      cell4.classList.add("px-4", "py-2", "border", "text-center");

      // Hide button
      const cell5 = row.insertCell();
      const hideButton = document.createElement("button");
      hideButton.textContent = "Hide";
      hideButton.classList.add(
        "px-3",
        "py-1",
        "bg-gray-500",
        "text-white",
        "rounded",
        "hover:bg-gray-600",
        "text-sm"
      );
      hideButton.onclick = () => {
        hideProfile(user.username);
        // Re-run the comparison to refresh the display
        compareFiles();
      };
      cell5.appendChild(hideButton);
      cell5.classList.add("px-4", "py-2", "border", "text-center");
    });
  }

  renderTableRows(sortedList);
  table.appendChild(tbody);
  tableWrapper.appendChild(table);
  resultDiv.appendChild(tableWrapper);

  // Add sort functionality
  document.getElementById("sortNotFollowingBack").addEventListener("change", (e) => {
    let sorted;
    switch (e.target.value) {
      case "recent":
        sorted = [...notFollowingBackList].sort(
          (a, b) => (b.timestamp || 0) - (a.timestamp || 0),
        );
        break;
      case "oldest":
        sorted = [...notFollowingBackList].sort(
          (a, b) => (a.timestamp || 0) - (b.timestamp || 0),
        );
        break;
      case "username":
        sorted = [...notFollowingBackList].sort((a, b) =>
          a.username.localeCompare(b.username),
        );
        break;
      default:
        sorted = notFollowingBackList;
    }
    renderTableRows(sorted);
  });
}

function displayMutualFollowersTable(mutualFollowersList, resultDiv) {
  // Section header
  const sectionHeader = document.createElement("h2");
  sectionHeader.classList.add(
    "text-2xl",
    "font-bold",
    "text-center",
    "mt-8",
    "mb-4",
  );
  sectionHeader.textContent = "Mutual Followers";
  resultDiv.appendChild(sectionHeader);

  if (mutualFollowersList.length === 0) {
    const noResultsDiv = document.createElement("div");
    noResultsDiv.classList.add(
      "p-6",
      "bg-gray-50",
      "shadow-md",
      "rounded-md",
      "border",
      "border-gray-300",
      "my-8",
      "mx-auto",
      "text-center",
    );
    noResultsDiv.innerText = "No mutual followers found.";
    resultDiv.appendChild(noResultsDiv);
    return;
  }

  // Sort by you followed first with largest deltas first
  const sortedList = [...mutualFollowersList]
    .filter(
      (u) =>
        u.youFollowedTimestamp &&
        u.theyFollowedTimestamp &&
        u.youFollowedTimestamp < u.theyFollowedTimestamp,
    )
    .sort((a, b) =>
      (b.theyFollowedTimestamp - b.youFollowedTimestamp) -
      (a.theyFollowedTimestamp - a.youFollowedTimestamp)
    );

  // Create table wrapper
  const tableWrapper = document.createElement("div");
  tableWrapper.classList.add(
    "p-6",
    "bg-gray-50",
    "shadow-md",
    "rounded-md",
    "border",
    "border-gray-300",
    "my-8",
    "mx-auto",
    "overflow-x-auto",
  );
  tableWrapper.style.maxWidth = "95%";

  // Add sort controls
  const sortControls = document.createElement("div");
  sortControls.classList.add("mb-4", "text-center");
  sortControls.innerHTML = `
    <label class="mr-2 font-semibold">Sort by:</label>
    <select id="sortMutualFollowers" class="px-3 py-1 border rounded">
      <option value="you-first">You Followed First</option>
      <option value="they-first">They Followed First</option>
    </select>
  `;
  tableWrapper.appendChild(sortControls);

  // Create table
  const table = document.createElement("table");
  table.classList.add("w-full", "text-left", "border-collapse");

  // Create header
  const thead = document.createElement("thead");
  const headerRow = thead.insertRow();
  const headers = [
    "#",
    "Username",
    "Follow Timeline",
    "Profile",
    "Actions",
  ];

  headers.forEach((headerText) => {
    const th = document.createElement("th");
    th.textContent = headerText;
    th.classList.add(
      "px-4",
      "py-2",
      "bg-green-500",
      "text-white",
      "font-semibold",
      "text-center",
      "border",
    );
    headerRow.appendChild(th);
  });

  table.appendChild(thead);

  // Create tbody
  const tbody = document.createElement("tbody");
  tbody.id = "mutualFollowersTableBody";

  function renderMutualRows(list) {
    tbody.innerHTML = "";
    list.forEach((user, index) => {
      const row = tbody.insertRow();

      // Number
      const cell1 = row.insertCell();
      cell1.textContent = index + 1;
      cell1.classList.add("px-4", "py-2", "border", "text-center");

      // Username
      const cell2 = row.insertCell();
      cell2.textContent = user.username;
      cell2.classList.add("px-4", "py-2", "border", "text-center");

      // Follow Timeline
      const cell3 = row.insertCell();
      if (
        !user.youFollowedTimestamp ||
        !user.theyFollowedTimestamp
      ) {
        cell3.textContent = "Unknown";
      } else if (user.youFollowedTimestamp === user.theyFollowedTimestamp) {
        cell3.textContent = "You followed each other at the same time";
      } else if (user.youFollowedTimestamp < user.theyFollowedTimestamp) {
        // You followed first, they followed later
        const delta = formatTimeDelta(user.youFollowedTimestamp, user.theyFollowedTimestamp);
        cell3.textContent = `They followed you ${delta} after you followed them`;
      } else {
        // They followed first, you followed later
        const delta = formatTimeDelta(user.theyFollowedTimestamp, user.youFollowedTimestamp);
        cell3.textContent = `You followed them ${delta} after they followed you`;
      }
      cell3.classList.add("px-4", "py-2", "border", "text-center");

      // Profile link
      const cell4 = row.insertCell();
      const link = document.createElement("a");
      link.href = user.href || `https://www.instagram.com/${user.username}`;
      link.target = "_blank";
      link.textContent = "View Profile";
      link.classList.add("text-blue-600", "hover:underline");
      cell4.appendChild(link);
      cell4.classList.add("px-4", "py-2", "border", "text-center");

      // Hide button
      const cell5 = row.insertCell();
      const hideButton = document.createElement("button");
      hideButton.textContent = "Hide";
      hideButton.classList.add(
        "px-3",
        "py-1",
        "bg-gray-500",
        "text-white",
        "rounded",
        "hover:bg-gray-600",
        "text-sm"
      );
      hideButton.onclick = () => {
        hideProfile(user.username);
        // Re-run the comparison to refresh the display
        compareFiles();
      };
      cell5.appendChild(hideButton);
      cell5.classList.add("px-4", "py-2", "border", "text-center");
    });
  }

  renderMutualRows(sortedList);
  table.appendChild(tbody);
  tableWrapper.appendChild(table);
  resultDiv.appendChild(tableWrapper);

  // Add sort functionality
  document
    .getElementById("sortMutualFollowers")
    .addEventListener("change", (e) => {
      let sorted;
      switch (e.target.value) {
        case "you-first":
          sorted = [...mutualFollowersList]
            .filter(
              (u) =>
                u.youFollowedTimestamp &&
                u.theyFollowedTimestamp &&
                u.youFollowedTimestamp < u.theyFollowedTimestamp,
            )
            .sort((a, b) =>
              (b.theyFollowedTimestamp - b.youFollowedTimestamp) -
              (a.theyFollowedTimestamp - a.youFollowedTimestamp)
            );
          break;
        case "they-first":
          sorted = [...mutualFollowersList]
            .filter(
              (u) =>
                u.youFollowedTimestamp &&
                u.theyFollowedTimestamp &&
                u.theyFollowedTimestamp < u.youFollowedTimestamp,
            )
            .sort(
              (a, b) =>
                (b.youFollowedTimestamp - b.theyFollowedTimestamp) -
                (a.youFollowedTimestamp - a.theyFollowedTimestamp),
            );
          break;
        default:
          sorted = mutualFollowersList;
      }
      renderMutualRows(sorted);
    });
}

function displayHiddenProfilesSection(hiddenNotFollowingBack, hiddenMutualFollowers, resultDiv) {
  const totalHidden = hiddenNotFollowingBack.length + hiddenMutualFollowers.length;

  // Don't show section if no hidden profiles
  if (totalHidden === 0) {
    return;
  }

  // Section header
  const sectionHeader = document.createElement("h2");
  sectionHeader.classList.add(
    "text-2xl",
    "font-bold",
    "text-center",
    "mt-8",
    "mb-4",
  );
  sectionHeader.textContent = `Hidden Profiles (${totalHidden})`;
  resultDiv.appendChild(sectionHeader);

  // Create table wrapper
  const tableWrapper = document.createElement("div");
  tableWrapper.classList.add(
    "p-6",
    "bg-gray-50",
    "shadow-md",
    "rounded-md",
    "border",
    "border-gray-300",
    "my-8",
    "mx-auto",
    "overflow-x-auto",
  );
  tableWrapper.style.maxWidth = "95%";

  // Create table
  const table = document.createElement("table");
  table.classList.add("w-full", "text-left", "border-collapse");

  // Create header
  const thead = document.createElement("thead");
  const headerRow = thead.insertRow();
  const headers = ["#", "Username", "Type", "Profile", "Actions"];

  headers.forEach((headerText) => {
    const th = document.createElement("th");
    th.textContent = headerText;
    th.classList.add(
      "px-4",
      "py-2",
      "bg-gray-500",
      "text-white",
      "font-semibold",
      "text-center",
      "border",
    );
    headerRow.appendChild(th);
  });

  table.appendChild(thead);

  // Create tbody
  const tbody = document.createElement("tbody");

  // Combine both lists with type information
  const allHidden = [
    ...hiddenNotFollowingBack.map(u => ({ ...u, type: "Not Following Back" })),
    ...hiddenMutualFollowers.map(u => ({ ...u, type: "Mutual Follower" }))
  ];

  allHidden.forEach((user, index) => {
    const row = tbody.insertRow();

    // Number
    const cell1 = row.insertCell();
    cell1.textContent = index + 1;
    cell1.classList.add("px-4", "py-2", "border", "text-center");

    // Username
    const cell2 = row.insertCell();
    cell2.textContent = user.username;
    cell2.classList.add("px-4", "py-2", "border", "text-center");

    // Type
    const cell3 = row.insertCell();
    cell3.textContent = user.type;
    cell3.classList.add("px-4", "py-2", "border", "text-center");

    // Profile link
    const cell4 = row.insertCell();
    const link = document.createElement("a");
    link.href = user.href || `https://www.instagram.com/${user.username}`;
    link.target = "_blank";
    link.textContent = "View Profile";
    link.classList.add("text-blue-600", "hover:underline");
    cell4.appendChild(link);
    cell4.classList.add("px-4", "py-2", "border", "text-center");

    // Unhide button
    const cell5 = row.insertCell();
    const unhideButton = document.createElement("button");
    unhideButton.textContent = "Unhide";
    unhideButton.classList.add(
      "px-3",
      "py-1",
      "bg-green-500",
      "text-white",
      "rounded",
      "hover:bg-green-600",
      "text-sm"
    );
    unhideButton.onclick = () => {
      unhideProfile(user.username);
      // Re-run the comparison to refresh the display
      compareFiles();
    };
    cell5.appendChild(unhideButton);
    cell5.classList.add("px-4", "py-2", "border", "text-center");
  });

  table.appendChild(tbody);
  tableWrapper.appendChild(table);
  resultDiv.appendChild(tableWrapper);
}
