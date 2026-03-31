document.getElementById('animalForm').onsubmit = async function(e) {
    e.preventDefault();
    
    // Grab all the values
    const id = document.getElementById('animalId').value;
    const fmd_status = document.getElementById('fmdStatus').value;
    const location = document.getElementById('animalLocation').value;
    const imageBase64 = document.getElementById('qrImagePreview').src;

    try {
        const res = await fetch('/.netlify/functions/save-animal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, fmd_status, location, imageBase64 })
        });

        if (res.ok) {
            alert('Animal registered successfully!');
            document.getElementById('animalForm').reset();
            document.getElementById('animalForm').style.display = "none";
            document.getElementById('qrImagePreview').src = "";
        } else {
            // Read the exact error from the backend so we know what broke
            const errorData = await res.json();
            console.error('Backend rejected the save:', errorData);
            alert(`Error saving animal: ${errorData.error}`);
        }
    } catch (networkError) {
        // This catches total network failures (like internet disconnecting)
        console.error('Network request failed entirely:', networkError);
        alert('Network error: Could not reach the server to save the animal.');
    }
};





/*


document.getElementById('animalForm').onsubmit = async function(e) {
    e.preventDefault();
    const id = document.getElementById('animalId').value;
    const fmd_status = document.getElementById('fmdStatus').value;
    const location = document.getElementById('animalLocation').value;
    const imageBase64 = document.getElementById('qrImagePreview').src;

    const res = await fetch('/.netlify/functions/save-animal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, fmd_status, location, imageBase64 })
    });

    if (res.ok) {
        alert('Animal registered!');
        document.getElementById('animalForm').reset();
        document.getElementById('animalForm').style.display = "none";
        document.getElementById('qrImagePreview').src = "";
    } else {
        alert('Error saving animal!');
    }
};




*/
/*
document.getElementById('animal-register-form').onsubmit = async (e) => {
  e.preventDefault();
  const id = document.getElementById('animal-id').value;
  const fmd_status = document.getElementById('fmd-status').value;
  const location = document.getElementById('location').value;
  // Assume you have a function getQRImageAsBase64()
  const imageBase64 = getQRImageAsBase64();

  const res = await fetch('/.netlify/functions/save-animal', {
    method: 'POST',
    body: JSON.stringify({ id, fmd_status, location, imageBase64 })
  });
  if (res.ok) alert('Animal Registered!');
};

*/