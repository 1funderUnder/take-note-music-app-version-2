This progressive web app is a music practice app designed to help music lovers keep track of their practice sessions. Use it to monitor your weekly goals
and challenge yourself to practice more each day. Here are a few things you can do with the app:
1. Log practice sessions with date and amount of time spent
2. Track progress towards goals
3. Keep track of songs you'd like to learn later
4. Practice anywhere, anytime with offline capabilities

Instructions for viewing:
Since the app is not hosted online, you will need to run it locally on your computer.
To ensure the best viewing experience, you should run it using a local server:
1. Download and extract the repository.
2. Open the folders in VS Code or your preferred code editor
3. Install a live server extension in your code editor and click "Go Live" to launch the app
4. Install the app through Chrome or Edge

Caching strategy:
This PWA uses a service worker to cache important assets, such as HTML, CSS, and Javascript files to ensure that it still works seamlessly even when the network connection is lost. Static files are stored during installation. It first checks the cache for the requested file. If the file is not found, it will fetch it from the network and optionally save it for next time. This provides quick load times for frequently accessed pages and offline functionality for static resources. When the app reconnects to the network, the files are automatically updated.

Installability:
A manifest.json file provides the data required so that browsers will recognize the app and allow it to be installed and displayed like a native application. This includes items such as the name, short name, description, start url, display, colors, icons, and screenshots. Display mode is set to standalone, which hides the browser UI, giving the app a native feel. The start URL tells the browser where the app should be launched from. Orientation is set to "any" allowing for future flexibility should updates include the addition of song sheets that are better viewed in a landscape view.

Data synchronization:
This app automatically handles data synchronization using both a cloud based database (Firebase) and IndexedDB for offline storage. When a user saves Practice sessions or songs, the app checks to see if there is a connection. If there is a connection, the data is saved to the cloud. If there is no connection, these sessions are cached and queued in an IndexedDB "outbox" waiting to be synced when the connection is restored. When the connection is restored, they are automatically synced to Firebase.

Creating: Practice session, adding songs to savedSongs page
Online Mode:
Fill out the form on the home screen or the Song List page
Click the save session button or the add song button.
You'll see a "Practice session saved!" or "Song added to your list!" message.
In this case, when the user clicks save, the app checks to see if the user is online. If the user is online, it saves the data to Firebase and caches it in IndexedDB for offline access. A new document is created in the Firebase collection in the Firebase database. The dashboard is updated with the new statistics.

Offline mode:
Click offline in Dev tools and repeat the same process. You'll see the following message instead:"You are offline. Session will sync when online."
In this case, the app detects that you are offline, and saves your data to IndexedDB using a local ID. It then adds it to an outbox waiting to be synced when the connection is returned. When the connection is restored, an online event is triggered and all queued items are sent to Firebase and removed from the queue.

A similar workflow is followed to save a song.

Reading: Home page, myStats page, savedSongs page, contact page, about page
View the information you'd like to see on any of these pages.
Online Mode:
A function checks to see if the Firebase database is online. If it is, that data is displayed and the IndexedDB cache is updated. If not, it displays the last synced data from IndexedDB instantly. Once online, this data will be refreshed with any new data from the Firebase database.

Offline Mode:
Once the app has determined that the database is offline, it instantly displays the last synced data from the IndexedDB cache file. When the connection is restored, this data will be refreshed with any new data from the Firebase database.

Update: Stats (home screen)
Online Mode:
Updates follow a similar pattern to the create function. Information is entered through the form on the home screen. When the information is entered, the minutes, progress bar, last practiced date, and longest session time are updated. You'll see the new information at the bottom of the home screen and also on the myStats page.

Offline Mode:
This is also similar to the create function. The new information is entered and added to the outbox waiting to be synced when the connection is returned. When the connection is restored, an online event is triggered and all queued items are sent to Firebase.

Delete: Delete saved songs
Go to the Saved Songs page. Click the delete button on the song you want to delete. You will see a "Song removed" message.
If online, the app removes the collection from Firebase immediately and it is removed from IndexedDB on the next sync when the connection is restored.

Authentication: 
Added user registration and security rules to ensure users only see their data.






