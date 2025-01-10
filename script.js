function onSignIn(credential) {
    console.log('Sub: ' + credential.sub); // Do not send to your backend! Use an ID token instead.
    console.log('Name: ' + credential.given_name + "" + credential.family_name);
    console.log('Picture: ' + credential.picture);
    console.log('Email: ' + credential.email); // This is null if the 'email' scope is not present.
  }