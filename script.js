
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
const DRIVE_FILE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
const FILE_FIELDS = 'id, parents, name, owners, modifiedTime, mimeType, webViewLink, webContentLink, thumbnailLink, contentHints';
const MAX_FILE_COUNT = 1000;
const INTERACTIVE = true;
// google: 
// const APP_ID = '80614719015';
// personal:
const APP_ID = '808003952064';


class App {
    #jwt = null;
    #onDocumentReadyStateChangeHandler = null;
    #onParentIdCopyClickHandler = null;
    #sessionLoadingPanel = null;
    #sessionActivePanel = null;
    #logoutButton = null;
    #sessionLoginPanel = null;
    #userName = null;
    #userEmail = null;
    #imgProfilePic = null;
    #getTokenButton = null;
    #fileIdText = null;
    #getFileButton = null;
    #authorizeFileButton = null;
    #pickFileButton = null;
    #listFilesButton = null;
    #filesTable = null;
    #placeholderRow = null;
    #templateRow = null;
    #debugText = null;

    #gapiReady = false;
    #tokenclient = null;
    #accessToken = null;
    #currentScopes = null;
    

    constructor() {
        if (document.readyState == "complete") {
            this.#initApp(false);
        } else {
            console.log(`init, readyState: ${document.readyState}`);    
            this.#onDocumentReadyStateChangeHandler = this.#onDocumentReadyStateChange.bind(this);
            document.addEventListener('readystatechange', this.#onDocumentReadyStateChangeHandler);
        }

        this.#onParentIdCopyClickHandler = this.#onParentIdCopyClick.bind(this);
    }

    #onDocumentReadyStateChange() {
        console.log(`onDocumentReadyStateChange, readyState: ${document.readyState}`);
        if (document.readyState === "complete") {
            this.#initApp(true);
        }
    }

    onLogin(credentials, jwt) {
        this.#jwt = jwt;
        localStorage.setItem('googleCredentials', credentials);
        this.#setCookie('SID', 'loggedIn', 30);
        
        this.#onLoginStateChanged();
    }

    #setCookie(name, value, days) {
        const now = new Date();
        const expiration = new Date(now.getTime() + (days * 24 * 60 * 60 * 1000));
        document.cookie = `${name}=${value};expires=${expiration.toUTCString()};path=/`;
    }

    #onGapiLoaded() {
        console.log("#onGapiLoaded");
    }

    #initApp(removeEventListener) {
        console.log(`#initApp, removeEventListener: ${removeEventListener}`);
        if (removeEventListener) {
            document.removeEventListener('readystatechange', this.#onDocumentReadyStateChangeHandler);
        }
    
        this.#initUI();

        if (gapi) {
          console.log('#initApp(): gapi already loaded, initializing');  
          this.#initGapiClient();
        } else {
            console.log('initApp(): gapi is NOT loaded, registering for event');  
            document.addEventListener('gapiloaded', this.#onGapiLoaded.bind(this));
        }

        let credentials = localStorage.getItem('googleCredentials');
        
        this.#loadGoogleToken();
    
        console.log(`credentials: ${credentials}`);
        this.#hide(this.#sessionLoadingPanel);
    
        if (credentials === null) {
            this.#show(this.#sessionLoginPanel);
        } else {
            this.#jwt = decodeJwtResponse(credentials);
            this.#onLoginStateChanged();
            this.#show(this.#sessionActivePanel);
        }
    }

    #initUI() {
        this.#sessionLoadingPanel = document.getElementById("sessionLoading");
        this.#sessionActivePanel = document.getElementById("sessionActive");
        this.#sessionLoginPanel = document.getElementById("sessionLogin");
        this.#imgProfilePic = document.getElementById("userProfilePic");
        this.#userName = document.getElementById("userName");
        this.#userEmail = document.getElementById("userEmail");
        this.#getTokenButton = document.getElementById("getTokenButton");
        this.#logoutButton = document.getElementById("logoutButton");
        this.#fileIdText = document.getElementById("fileIdText");
        this.#getFileButton = document.getElementById("getFileButton");
        this.#authorizeFileButton = document.getElementById("authorizeFileButton");
        this.#pickFileButton = document.getElementById('pickFileButton');
        this.#listFilesButton = document.getElementById("listFilesButton");
        this.#filesTable = document.getElementById('filesTable');
        this.#placeholderRow = document.getElementById('placeholderRow');
        this.#templateRow = document.getElementById('templateRow');
        this.#debugText = document.getElementById('debugText');

        this.#getTokenButton.addEventListener("click", this.#onGetTokenButtonClick.bind(this));
        this.#logoutButton.addEventListener("click", this.#onLogoutButtonClick.bind(this));
        this.#getFileButton.addEventListener("click", this.#onGetFileButtonClick.bind(this));
        this.#authorizeFileButton.addEventListener("click", this.#onAuthorizeFileButtonClick.bind(this));

        this.#pickFileButton.addEventListener("click", this.#onPickFileButtonClick.bind(this));
        this.#listFilesButton.addEventListener("click", this.#onListFilesButtonClick.bind(this));
    }

    #loadGoogleToken() {
        const tokenDataString = localStorage.getItem('googleTokenData');

        if (!tokenDataString) {
            return false;
        }

        const tokenData = JSON.parse(tokenDataString);

        // We could/should check whether the token is expired.  Let's not for now
        // and see if it will refresh automatically.
        this.#accessToken = tokenData.access_token;
        this.#currentScopes = tokenData.scopes;

        return true;
    }

    #onLogoutButtonClick() {
        localStorage.clear();
        this.#setCookie('SID', '', -1);
        this.#jwt = null;
        this.#accessToken = null;
        this.#currentScopes = null;
        this.#onLoginStateChanged();
    }

    #onGetTokenButtonClick() {
        this.#requestScope('openid');
    }

    #onLoginStateChanged() {
        if (this.#jwt === null) {
            this.#hide(this.#sessionActivePanel);
            this.#userName.innerText = '';
            this.#userEmail.innerText = '';
            this.#imgProfilePic.src = '';
            this.#show(this.#sessionLoginPanel);
        } else {
            this.#hide(this.#sessionLoginPanel);
            this.#userName.innerText = this.#jwt.name;
            this.#userEmail.innerText = this.#jwt.email;
            this.#imgProfilePic.src = this.#jwt.picture;
            this.#show(this.#sessionActivePanel);
        }
    }

    async #onGetFileButtonClick() {
        const fileId = this.#fileIdText.value.trim();

        if (fileId === '') {
            return;
        }

        this.getFile(fileId);
    }

    async #onAuthorizeFileButtonClick() {
        const fileId = this.#fileIdText.value.trim();

        if (fileId === '') {
            return false;
        }

        await this.authorizeFile(fileId);

        return true;
    }

    async #onListFilesButtonClick() {
        this.#show(this.#placeholderRow);
        const currentRows = document.querySelectorAll("#filesTable tr.file");
        
        if (currentRows) {
            for (let i = 0; i < currentRows.length; i++) {
                currentRows[i].remove();
            }
        }

        await this.listFiles();
    }

    async #onPickFileButtonClick() {
        if (this.#hasScope(DRIVE_FILE_SCOPE)) {
            return await this.pickFile();
        }

        // Request drive file scope, and then execute pick file.
        const pickFileCallback = this.pickFile.bind(this);
        await this.#requestScope(DRIVE_FILE_SCOPE, true);
        return this.pickFile();
    }

    async #onParentIdCopyClick(event) {
        const parentId = event.target.parentElement.querySelector('.parent-id').innerText;
        let result = false;
        try {
            await navigator.clipboard.writeText(parentId);
            this.#printDebug(`Copied parentId ${parentId} to clipboard`);
            result = true;
        } catch (error) {
            console.log('Error copying to clipboard', error);
        }

        return result;
    }

    #hasScope(scope) {
        if (this.#currentScopes === null) {
            return false;
        }

        return this.#currentScopes.indexOf(scope) !== -1;
    }

    async #requestScope(scope, interactive) {
        const app = this;
        return new Promise((resolve, reject) => {
            if (app.#jwt === null) {
                reject("User not logged in");
                return;
            }

            const tokenCallback = (tokenResponse) => {
                if (app.#processTokenResponse(tokenResponse)) {
                    resolve(true);
                } else {
                    reject('Unable to obtain token');
                }
            };
            app.#tokenclient = google.accounts.oauth2.initTokenClient({
                client_id: app.#jwt.aud,
                scope: scope,
                include_granted_scopes: true,
                enable_granular_consent: true,
                //select_account: false, 
                login_hint: app.#jwt.sub,
                prompt: '', //interactive ? 'consent' : 'none',
                callback: tokenCallback
            });
            app.#tokenclient.requestAccessToken();
        });
    }

    #processTokenResponse(tokenResponse) {
        console.log(`#processTokenResponse`);
        if (tokenResponse.error) {
            console.log(`Unable to retrieve token: ${tokenResponse.error} (${tokenResponse.error_reason})`);
            return false;
        }

        let now = new Date();
        this.#accessToken = tokenResponse.access_token;
        this.#currentScopes = tokenResponse.scope.split(' ');
        console.log(`#processTokenResponse, scopes: ${this.#currentScopes}`);
        localStorage.setItem('googleTokenData', JSON.stringify({
            access_token: this.#accessToken,
            scopes: this.#currentScopes,
            expires: now.getTime() + ((tokenResponse.expires_in - 10) * 1000)
        }));

        // Note that requestAccessToken automatically updates the gapi.client, so there is no need to manually set the token
        //gapi.client.setToken(this.#accessToken);

        this.#validateToken(this.#accessToken);

        return true;
    }

    async #validateToken(token) {
        const url = `https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${token}`;
        const response = await fetch(url);
        const data = await response.json();
        console.log('#validateToken', data);
    }

    #show(element) {
        let displayValue = element.getAttribute('data-visible-display-mode');
        if (displayValue === null) {
            displayValue = 'block';
        }

        element.style.display = displayValue;
    }
    
    #hide(element) {
        element.style.display = 'none';
    }

    async getFile(fileId) {
        let response = null;
        let result = false;
        try {
            response = await this.#execGoogleApiRequest(
                DRIVE_FILE_SCOPE, 
                () => {
                    return gapi.client.drive.files.get({
                        'fileId': fileId,
                        'fields': FILE_FIELDS,
                        'supportsAllDrives': true,
                    });
                });
            console.log('getFile response: ', response);
            this.#printDebug('Retrieved file: ' + JSON.stringify(response.result));
            result = true;
        }  catch (error) {
            if (error.status === 404) {
                this.#printDebug(`File ${fileId} not found.  If it's a valid file ID, authorization may be required.`);
            } else {
                this.#printDebug(`Failed to get file ${fileId}: ${error}`);
                console.error('Failed to get file', error);
            }
        }

        return result;
    }

    async listFiles() {
        let run = true;
        let pageToken = null;
        let fileCount = 0;
        const request = {
            'pageSize': 25,
            'corpora': 'allDrives',
            'includeItemsFromAllDrives': true,
            'supportsAllDrives': true,
            'fields': `nextPageToken,incompleteSearch,files(${FILE_FIELDS})`,
          };

        while (run) {
            run = false;
            const result = await this.#fetchFileListPage(request, pageToken);
 
            if (result.files) {
                fileCount = fileCount + result.files.length;
                this.#appendFileRows(result.files);
                
                if (result.nextPageToken && fileCount < MAX_FILE_COUNT) {
                    run = true;
                    pageToken = result.nextPageToken;
                }
            }
        }

        this.#hide(this.#placeholderRow);
    }

    async #fetchFileListPage(request, pageToken) {
        if (pageToken === null) {
            delete request.pageToken;
        } else {
            request.pageToken = pageToken;
        }

        const response = await this.#execGoogleApiRequest(
            DRIVE_FILE_SCOPE,
            () => { return gapi.client.drive.files.list(request); });
        console.log('listFiles response: ', response);

        return {
            files: response.result.files,
            nextPageToken: response.result.nextPageToken
        };
    }

    async #execGoogleApiRequest(scope, call) {
        // Request the required scope if we don't already have it.
        if (!this.#hasScope(scope)) {
            await this.#requestScope(scope, INTERACTIVE);
        }

        let response = null;
        let run = true;
        let attempt = 0;
        
        while (run) {
            run = false;

            try {
                attempt = attempt + 1;
                response = await call();
            } catch (error) {
                if (error.status === 401) {
                    if (attempt >= 2) {
                        throw new Error(`Received status 401 unauthorized on attempt ${attempt}`);
                    }
                    await this.#requestScope(scope);
                    run = true;
                } else {
                    throw error;
                }
            }
        }

        return response;
    }

    #appendFileRows(files) {
        const tbody = this.#filesTable.getElementsByTagName('tbody')[0];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            //console.log('file', file);

            // Perform a deep clone
            const newRow = this.#templateRow.cloneNode(true);
            newRow.removeAttribute('id');
            newRow.classList.add('file');
            const cells = newRow.getElementsByTagName("td");
            const parentIdElement = newRow.querySelector(".parent-id");
            const parentIdCopyIconElement = newRow.querySelector('i.bi-copy');
            cells[0].innerText = file.id;
            parentIdElement.innerText = file.parents[0];
            parentIdCopyIconElement.addEventListener('click', this.#onParentIdCopyClickHandler);
            cells[2].innerText = file.name;
            cells[3].innerText = file.mimeType;

            if (file.owners) {
              cells[4].innerText = file.owners[0].emailAddress;
            } else {
                // Files in Shared Drives don't have owners
                cells[4].innerText = 'No Owner';
            }
            cells[5].innerText = file.modifiedTime;
            tbody.appendChild(newRow);
        }
    }

    async pickFile() {
        const token = gapi.client.getToken();
        
        // Customize a docs view for Drive
        const driveView = new google.picker.DocsView(google.picker.ViewId.DOCS);

        driveView.setIncludeFolders(true);
        driveView.setSelectFolderEnabled(true);
        driveView.setMode(google.picker.DocsViewMode.LIST);
        
        // Start the view at the "My Drive" root.  The user can still search for docs outside the root.
        // See https://developers.google.com/drive/picker/reference/picker.docsview for more options.
        driveView.setParent('ROOT');

        const sdView = new google.picker.DocsView(google.picker.ViewId.DOCS);
        // This will show only Shared Drives
        sdView.setEnableDrives(true);
        sdView.setIncludeFolders(true);
        sdView.setSelectFolderEnabled(true);
        sdView.setMode(google.picker.DocsViewMode.LIST);
        
        const picker = new google.picker.PickerBuilder()
        .addView(driveView)
        .addView(sdView)
        // Supply only the token itself, rather than a token wrapper object.
        .setOAuthToken(token.access_token) 
        // API key Not needed when using OAuth
        //.setDeveloperKey('API_KEY') 
        .setAppId(APP_ID) // This needs to be set for the picker to add the app to the file's App ACL.
        .setCallback(this.#onPickerEvent.bind(this))
        .build();
        picker.setVisible(true);        
    }

    async authorizeFile(fileId) {
        if (!this.#hasScope(DRIVE_FILE_SCOPE)) {
            await this.#requestScope(DRIVE_FILE_SCOPE);
        }

        const token = gapi.client.getToken();

        // Create a DOCS view with a specific file Id preselected
        const driveView = new google.picker.DocsView(google.picker.ViewId.DOCS);
        driveView.setIncludeFolders(true);
        driveView.setSelectFolderEnabled(true);
        driveView.setFileIds(fileId);

        const picker = new google.picker.PickerBuilder()
        .addView(driveView)
        // Supply only the token itself, rather than the token wrapper object.
        .setOAuthToken(token.access_token) 
        // API key Not needed when using OAuth
        //.setDeveloperKey('API_KEY') 
        .setAppId(APP_ID) // This needs to be set for the picker to add the app to the file's App ACL.
        .setCallback(this.#onPickerEvent.bind(this))
        .build();
        picker.setVisible(true);        
    }

    #onPickerEvent(event) {
        console.log('#onPickerEvent', event);
    }

    #initGapiClient() {
        console.log(`gapi: ${gapi}`);
        gapi.load('client:picker', this.#onGapiClientLoaded.bind(this));
    }

    async #onGapiClientLoaded() {
        console.log(`gapi.client: ${gapi.client}`);
        
        if (this.#accessToken) {
            gapi.client.setToken({access_token: this.#accessToken});
        }

        console.log(`#onGapiClientLoaded: Loading discovery doc`);
        await gapi.client.init({
          discoveryDocs: [DISCOVERY_DOC],
        });
        this.#gapiReady = true;
        console.log(`#onGapiClientLoaded: Gapi ready!, gapi.client.drive: ${gapi.client.drive}`);
    }

    #printDebug(message) {
        this.#debugText.value = message + '\r\n' + this.#debugText.value;
    }
}

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
    app.onLogin(response.credential, payload);
}

const app = new App();