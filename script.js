
 function decodeJwtResponse(token) {
   let base64Url = token.split('.')[1];
   let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
   let jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
       return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
   }).join(''));

   return JSON.parse(jsonPayload);
 }

function onSignIn(response) {
    const payload = decodeJwtResponse(response.credential)
    console.log('Sub: ' + payload.sub); // Do not send to your backend! Use an ID token instead.
    console.log('Name: ' + payload.name);
    console.log('Picture: ' + payload.picture);
    console.log('Email: ' + payload.email); // This is null if the 'email' scope is not present.
  }

