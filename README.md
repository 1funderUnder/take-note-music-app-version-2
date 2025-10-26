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

This app was created by Laura Funderburk.
