const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/shrey/upload';
const CLOUDINARY_UPLOAD_PRESEST = 'lom4m0su';

window.onload = function () {
  var form = document.getElementById('form');
  var fileUpload = document.getElementById('file-upload');
  var formData = new FormData();
  fileUpload.addEventListener('change', e => {
    var file = e.target.files[0];
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESEST);
  });

  form.addEventListener('submit', e => {
    e.preventDefault();
    axios({
      url: CLOUDINARY_URL,
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      data: formData
    }).then(res => {
      const data = {
        name: document.getElementById('name').value.toLowerCase(),
        desc: document.getElementById('desc').value,
        category: document.getElementById('categ').value.toLowerCase(),
        hashs: document.getElementById('hash').value.toLowerCase(),
        url: res.data.secure_url
      };
      fetch('/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).then(console.log)
    }).catch(console.log);
  });
}