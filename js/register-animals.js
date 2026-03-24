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