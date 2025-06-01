// Global file storage
let leftFiles = [];
let rightFiles = [];

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
            if (
              item.string_list_data &&
              item.string_list_data[0] &&
              item.string_list_data[0].value
            ) {
              accumulator.push(item.string_list_data[0].value);
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
              accumulator.push(item.string_list_data[0].value);
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

  // Make sure we have unique usernames only
  const uniqueFollowers = [...new Set(followerList)];
  const uniqueFollowing = [...new Set(followingList)];

  // Find users you follow who don't follow you back
  const followingButNotFollowingBackList = uniqueFollowing.filter(
    (user) => !uniqueFollowers.includes(user),
  );

  // Display summary statistics
  const statsDiv = document.createElement("div");
  statsDiv.classList.add("mb-6", "text-center");

  statsDiv.innerHTML = `
        <p class="text-lg mb-2">
            <b>Total followers:</b> ${uniqueFollowers.length} |
            <b>Total following:</b> ${uniqueFollowing.length}
        </p>
        <p class="text-lg mb-4">
            <b>Users not following you back:</b> ${followingButNotFollowingBackList.length}
            (${Math.round((followingButNotFollowingBackList.length / uniqueFollowing.length) * 100)}%)
        </p>
    `;

  resultDiv.innerHTML = "";
  resultDiv.appendChild(statsDiv);

  // Create and display the results table
  displayResultsTable(followingButNotFollowingBackList, resultDiv);
}

function displayResultsTable(notFollowingBackList, resultDiv) {
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

  const numberWidth = notFollowingBackList.length.toString().length;

  const maxNameLength = Math.max(
    ...notFollowingBackList.map((name) => name.length),
  );
  const nameWidth = Math.min(maxNameLength + 2, 30);

  const table = document.createElement("table");
  table.classList.add("mx-auto", "text-left", "border-collapse");

  const headerRow = table.insertRow(0);

  const headerCell1 = headerRow.insertCell(0);
  headerCell1.innerHTML = "#";
  headerCell1.classList.add(
    "px-2",
    "py-2",
    "bg-blue-500",
    "text-white",
    "font-semibold",
    "text-center",
  );
  headerCell1.style.width = `${numberWidth + 2}ch`;

  const headerCell2 = headerRow.insertCell(1);
  headerCell2.innerHTML = "Username";
  headerCell2.classList.add(
    "px-2",
    "py-2",
    "bg-blue-500",
    "text-white",
    "font-semibold",
    "text-center",
  );
  headerCell2.style.width = `${nameWidth}ch`;

  for (let i = 0; i < notFollowingBackList.length; i++) {
    const row = table.insertRow(i + 1);

    const cell1 = row.insertCell(0);
    cell1.innerHTML = i + 1;
    cell1.classList.add("px-2", "py-2", "border", "text-center");
    cell1.style.width = `${numberWidth + 2}ch`;

    const cell2 = row.insertCell(1);
    cell2.innerHTML = notFollowingBackList[i];
    cell2.classList.add("px-2", "py-2", "border", "text-center");
    cell2.style.width = `${nameWidth}ch`;
  }

  const tableWrapper = document.createElement("div");
  const totalWidth = numberWidth + nameWidth + 6;
  tableWrapper.classList.add(
    "p-6",
    "bg-gray-50",
    "shadow-md",
    "rounded-md",
    "border",
    "border-gray-300",
    "my-8",
    "mx-auto",
  );
  tableWrapper.style.width = `${totalWidth}ch`;
  tableWrapper.style.maxWidth = "100%";

  tableWrapper.appendChild(table);
  resultDiv.appendChild(tableWrapper);
}
