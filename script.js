function compareFiles() {
    const leftFileInput = document.getElementById("leftUpload");
    const rightFileInput = document.getElementById("rightUpload");
    const resultDiv = document.getElementById("who_doesnt_follow_back");

    if (leftFileInput.files.length === 0 || rightFileInput.files.length === 0) {
        alert("Please select two JSON files for comparison.");
        return;
    }

    const leftFile = leftFileInput.files[0];
    const rightFile = rightFileInput.files[0];

    const reader = new FileReader();

    reader.onload = function(e) {
        const leftData = JSON.parse(e.target.result);

        // Extract values from the left data
        const followerList = leftData.map(item => item.string_list_data[0].value);

        // Now read the right file
        const rightReader = new FileReader();

        rightReader.onload = function(e) {
            const rightData = JSON.parse(e.target.result);

            // Extract values from the right data
            const followingList = rightData.relationships_following.map(item => item.string_list_data[0].value);

            // Compare the lists and find values in following but not in followers
            const followingButNotFollowingBackList = followingList.filter(value => !followerList.includes(value));

            // Create a table with the result
            const table = document.createElement("table");
            table.id = "who_doesnt_follow_back_table";

            const headerRow = table.insertRow(0);
            const headerCell1 = headerRow.insertCell(0);
            headerCell1.innerHTML = "Number";
            const headerCell2 = headerRow.insertCell(1);
            headerCell2.innerHTML = "Name";

            for (let i = 0; i < followingButNotFollowingBackList.length; i++) {
                const row = table.insertRow(i + 1);
                const cell1 = row.insertCell(0);
                cell1.innerHTML = i + 1;
                const cell2 = row.insertCell(1);
                cell2.innerHTML = followingButNotFollowingBackList[i];
            }

            // Replace the content of the result div with the table
            resultDiv.innerHTML = "";
            resultDiv.appendChild(table);
        };

        rightReader.readAsText(rightFile);
    };

    reader.readAsText(leftFile);
}
