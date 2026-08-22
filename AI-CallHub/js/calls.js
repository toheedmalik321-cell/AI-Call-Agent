// ==============================
// Check Login
// ==============================

const token = localStorage.getItem("token");

if (!token) {
    window.location = "/login";
}

// ==============================
// Load Calls
// ==============================

async function loadCalls() {

    try {

        const res = await fetch("/api/calls", {

            headers: {

                Authorization: "Bearer " + token

            }

        });

        const data = await res.json();

        const table = document.getElementById("callsTable");

        table.innerHTML = "";

        if (!data.success || data.data.length === 0) {

            table.innerHTML = `
            <tr>
                <td colspan="5" class="text-center p-8 text-gray-400">
                    No Calls Found
                </td>
            </tr>
            `;

            return;

        }

        data.data.forEach(call => {

            table.innerHTML += `

            <tr class="border-t border-white/10">

                <td class="p-4">
                    ${call.customerName || "Unknown Customer"}
                </td>

                <td class="p-4">
                    ${call.phoneNumber}
                </td>

                <td class="p-4">
                    <span class="bg-blue-600 px-3 py-1 rounded-full">
                        ${call.status}
                    </span>
                </td>

                <td class="p-4">
                    ${call.duration} sec
                </td>

                <td class="p-4 flex gap-2">

                    <a
                    href="/call-details?id=${call._id}"
                    class="bg-green-600 hover:bg-green-700 px-3 py-2 rounded">

                    View

                    </a>

                    <button
                    onclick="deleteCall('${call._id}')"
                    class="bg-red-600 hover:bg-red-700 px-3 py-2 rounded">

                    Delete

                    </button>

                </td>

            </tr>

            `;

        });

    }

    catch(err){

        console.log(err);

    }

}

// ==============================
// Delete Call
// ==============================

async function deleteCall(id){

    if(!confirm("Delete this call?")) return;

    try{

        const res = await fetch("/api/calls/" + id,{

            method:"DELETE",

            headers:{

                Authorization:"Bearer "+token

            }

        });

        const data = await res.json();

        alert(data.message);

        loadCalls();

    }

    catch(err){

        console.log(err);

    }

}

// ==============================
loadCalls();