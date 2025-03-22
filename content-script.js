// Prevent multiple injections
if (window.linkedInParserInitialized) {
    console.log('Parser already initialized');
} else {
    window.linkedInParserInitialized = true;

    // LinkedIn Profile Parser
    class LinkedInProfileParser {
        constructor() {
            this.profileData = {
                firstName: '',
                lastName: '',
                jobTitle: '',
                companyName: '',
                mobileNumber: '',
                personalEmail: '',
                businessEmail: '',
                location: '',
                linkedinProfile: window.location.href,
                referrerEmail: ''
            };
        }

        async parseProfile() {
            try {
                console.log('Starting profile parsing...');

                // Wait for the main profile section to load
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // Get name (try multiple selectors)
                const nameElement = document.querySelector('.text-heading-xlarge') || 
                                  document.querySelector('.pv-text-details__left-panel h1') ||
                                  document.querySelector('.ph5 h1');
                                  
                if (nameElement) {
                    const fullName = nameElement.textContent.trim().split(' ');
                    this.profileData.firstName = fullName[0] || '';
                    this.profileData.lastName = fullName.slice(1).join(' ') || '';
                    console.log('Name found:', this.profileData.firstName, this.profileData.lastName);
                }

                // Get job title and company (try multiple selectors)
                const titleElement = document.querySelector('.pv-text-details__left-panel .text-body-medium') ||
                                   document.querySelector('.ph5 .text-body-medium') ||
                                   document.querySelector('.pv-text-details__position-header');
                                   
                if (titleElement) {
                    const titleText = titleElement.textContent.trim();
                    // Split "Job Title at Company" format
                    const parts = titleText.split(' at ');
                    if (parts.length > 1) {
                        this.profileData.jobTitle = parts[0].trim();
                        this.profileData.companyName = parts[1].trim();
                    } else {
                        this.profileData.jobTitle = titleText;
                    }
                    console.log('Title found:', this.profileData.jobTitle);
                    console.log('Company found:', this.profileData.companyName);
                }

                // If company name wasn't found in title, try separate company element
                if (!this.profileData.companyName) {
                    const companyElement = document.querySelector('.pv-text-details__right-panel .inline-show-more-text') || 
                                         document.querySelector('.pv-text-details__right-panel .inline-block') ||
                                         document.querySelector('.ph5 .pv-text-details__right-panel');
                    if (companyElement) {
                        this.profileData.companyName = companyElement.textContent.trim();
                        console.log('Company found from separate element:', this.profileData.companyName);
                    }
                }

                // Get location (try multiple selectors)
                const locationElement = document.querySelector('.pv-text-details__default-text') || 
                                      document.querySelector('.text-body-small[href*="geo"]') || 
                                      document.querySelector('.pb2 .text-body-small:not([class*="distance"]):not([class*="degree"])');
                
                if (locationElement) {
                    this.profileData.location = locationElement.textContent.trim();
                    console.log('Location found:', this.profileData.location);
                }

                // Set LinkedIn URL (clean version without query parameters)
                this.profileData.linkedinProfile = window.location.href.split('?')[0];
                console.log('LinkedIn URL:', this.profileData.linkedinProfile);

                // Get contact info by clicking contact info button and waiting for modal
                const contactInfoButton = document.querySelector('.pv-top-card-v2__contact-info') ||
                                       document.querySelector('[data-control-name="contact_see_more"]');
                if (contactInfoButton) {
                    contactInfoButton.click();
                    await new Promise(resolve => setTimeout(resolve, 1500));

                    // Extract contact information from modal
                    const contactModal = document.querySelector('.artdeco-modal');
                    if (contactModal) {
                        // Get email addresses
                        const emailSection = contactModal.querySelector('.ci-email');
                        if (emailSection) {
                            const emailElements = emailSection.querySelectorAll('a');
                            emailElements.forEach(element => {
                                const emailText = element.textContent.trim();
                                if (emailText.includes('@')) {
                                    const emailType = element.closest('.pv-contact-info__ci-container')?.textContent.toLowerCase() || '';
                                    if (emailType.includes('work') || emailType.includes('business')) {
                                        this.profileData.businessEmail = emailText;
                                    } else {
                                        this.profileData.personalEmail = emailText;
                                    }
                                }
                            });
                        }

                        // Get phone number
                        const phoneSection = contactModal.querySelector('.ci-phone');
                        if (phoneSection) {
                            const phoneElement = phoneSection.querySelector('span.t-black--light') ||
                                               phoneSection.querySelector('a') ||
                                               phoneSection.querySelector('.pv-contact-info__ci-container');
                            if (phoneElement) {
                                const phoneText = phoneElement.textContent.trim();
                                // Only set if it looks like a phone number
                                if (phoneText.match(/[\d\s\+\-\(\)]/)) {
                                    this.profileData.mobileNumber = phoneText.replace(/\s+/g, ' ').trim();
                                }
                            }
                        }

                        // Close the modal
                        const closeButton = contactModal.querySelector('.artdeco-modal__dismiss');
                        if (closeButton) {
                            closeButton.click();
                        }
                    }
                }

                console.log('Final profile data:', this.profileData);
                return {
                    success: true,
                    data: this.profileData
                };
            } catch (error) {
                console.error('Error parsing profile:', error);
                return {
                    success: false,
                    error: error.message
                };
            }
        }
    }

    // Initialize parser and set up message listener
    console.log('Content script loaded');
    const parser = new LinkedInProfileParser();

    // Listen for messages from the extension
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        console.log('Message received:', request);
        
        if (request.action === 'getProfileData') {
            parser.parseProfile()
                .then(response => {
                    console.log('Sending response:', response);
                    sendResponse(response);
                })
                .catch(error => {
                    console.error('Error:', error);
                    sendResponse({ success: false, error: error.message });
                });
            return true; // Required to use sendResponse asynchronously
        }
    });
}