// Toggle Password Visibility
window.togglePassword = function(inputId, icon) {
    const input = document.getElementById(inputId);
    if (input.type === "password") {
        input.type = "text";
        icon.textContent = "visibility";
    } else {
        input.type = "password";
        icon.textContent = "visibility_off";
    }
};

// Import Firebase Auth
import { auth, db } from "./firebaseConfig.js";
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

console.log("signin.js loaded successfully");

document.addEventListener("DOMContentLoaded", () => {

    // Check if user is logged in
    onAuthStateChanged(auth, (user) => {
        console.log("Auth state changed:", user ? user.email : "not logged in");
        if (user) {
            // user is logged in, redirect to home page
            window.location.href = "/index.html";
        }
    });

    // Select elements
  const signInForm = document.getElementById("sign-in-form");
  const signUpForm = document.getElementById("sign-up-form");
  const showSignUp = document.getElementById("show-signup");
  const showSignIn = document.getElementById("show-signin");
  const signInBtn = document.getElementById("sign-in-btn");
  const signUpBtn = document.getElementById("sign-up-btn");

  console.log("Sign In Button Found:", signInBtn !== null);
  console.log("Sign Up Button Found:", signUpBtn !== null);

  // Show sign in form
  if (showSignIn) {
    showSignIn.addEventListener("click", () => {
        console.log("Switching to sign in form");
        signUpForm.style.display = "none";
        signInForm.style.display = "block";
    });
  }

  // Show sign up form
    if (showSignUp) {
    showSignUp.addEventListener("click", () => {
        console.log("Switching to sign up form");
        signInForm.style.display = "none";
        signUpForm.style.display = "block";
    });
  }

  // Sign up new users
  if (signUpBtn) {
    console.log("Adding click listener to sign up button");
    signUpBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        console.log("Sign up button clicked!");

        const name = document.getElementById("sign-up-name").value.trim();
        const email = document.getElementById("sign-up-email").value.trim();
        const password = document.getElementById("sign-up-password").value;
        const confirmPassword = document.getElementById("sign-up-confirm-password").value;

        console.log("Form values - Name:", name, "Email: ", email);
   
   // Validation
   if (!name) {
    M.toast({ html: "Please enter your name", classes: "red lighten-1 "});
    return;
   }
    if (!email) {
    M.toast({ html: "Please enter your email", classes: "red lighten-1 "});
    return;
   }
    if (!password || password.length < 6) {
    M.toast({ html: "Password must be at least 6 characters", classes: "red lighten-1 "});
    return;
   }
    if (password !== confirmPassword) {
    M.toast({ html: "Passwords do not match", classes: "red lighten-1 "});
    return;
   }
   
   // Disable button while processing
      signUpBtn.disabled = true;
      signUpBtn.innerHTML = '<i class="material-icons left">hourglass_empty</i>Creating Account...';

      try {
        console.log("Attempting to create user...");
        
        // Create user with Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        console.log("User created:", user.uid);

        // Update user profile with display name
        await updateProfile(user, {
          displayName: name
        });
        console.log("Profile updated");

        // Create user document in Firestore
        const userDocRef = doc(db, "users", user.uid);
        await setDoc(userDocRef, {
          email: email,
          displayName: name,
          createdAt: new Date().toISOString(),
          weeklyGoal: 300 // Default weekly goal in minutes
        });
        console.log("User document created in Firestore");

        M.toast({ html: "Account created successfully!", classes: "green" });
        
        // Redirect to home page
        setTimeout(() => {
          window.location.href = "/index.html";
        }, 1000);

      } catch (error) {
        console.error("Sign up error:", error);
        
        // Handle specific error codes
        let errorMessage = "Sign up failed. Please try again.";
        switch (error.code) {
          case "auth/email-already-in-use":
            errorMessage = "This email is already registered. Please sign in.";
            break;
          case "auth/invalid-email":
            errorMessage = "Please enter a valid email address.";
            break;
          case "auth/weak-password":
            errorMessage = "Password is too weak. Please use a stronger password.";
            break;
          case "auth/operation-not-allowed":
            errorMessage = "Email/password sign up is not enabled.";
            break;
        }
        
        M.toast({ html: errorMessage, classes: "red lighten-1" });
        
        // Re-enable button
        signUpBtn.disabled = false;
        signUpBtn.innerHTML = '<i class="material-icons left">person_add</i>Create Account';
      }
    });
  }

  // Sign In Existing Users
  if (signInBtn) {
    console.log("Adding click listener to sign in button");
    signInBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      console.log("Sign in button clicked!");
      
      const email = document.getElementById("sign-in-email").value.trim();
      const password = document.getElementById("sign-in-password").value;

      console.log("Attempting sign in with email:", email);

      // Validation
      if (!email) {
        M.toast({ html: "Please enter your email", classes: "red lighten-1" });
        return;
      }

      if (!password) {
        M.toast({ html: "Please enter your password", classes: "red lighten-1" });
        return;
      }

      // Disable button while processing
      signInBtn.disabled = true;
      signInBtn.innerHTML = '<i class="material-icons left">hourglass_empty</i>Signing In...';

      try {
        console.log("Calling signInWithEmailAndPassword...");
        await signInWithEmailAndPassword(auth, email, password);
        console.log("Sign in successful!");
        
        M.toast({ html: "Welcome back!", classes: "green" });
        
        // Redirect to home page
        setTimeout(() => {
          window.location.href = "/index.html";
        }, 500);

      } catch (error) {
        console.error("Sign in error:", error);
        
        // Handle specific error codes
        let errorMessage = "Sign in failed. Please try again.";
        switch (error.code) {
          case "auth/user-not-found":
            errorMessage = "No account found with this email.";
            break;
          case "auth/wrong-password":
            errorMessage = "Incorrect password. Please try again.";
            break;
          case "auth/invalid-email":
            errorMessage = "Please enter a valid email address.";
            break;
          case "auth/user-disabled":
            errorMessage = "This account has been disabled.";
            break;
          case "auth/too-many-requests":
            errorMessage = "Too many attempts. Please try again later.";
            break;
          case "auth/invalid-credential":
            errorMessage = "Invalid email or password.";
            break;
        }
        
        M.toast({ html: errorMessage, classes: "red lighten-1" });
        
        // Re-enable button
        signInBtn.disabled = false;
        signInBtn.innerHTML = '<i class="material-icons left">login</i>Sign In';
      }
    });
  }

  // Allow Enter key to submit forms
  document.querySelectorAll('input').forEach(input => {
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (signInFormContainer.style.display !== 'none' && signInBtn) {
          signInBtn.click();
        } else if (signUpBtn) {
          signUpBtn.click();
        }
      }
    });
  });

  console.log("Auth setup complete");
});
