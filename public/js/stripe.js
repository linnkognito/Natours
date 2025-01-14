/* eslint-disable */
import axios from 'axios';
import { showAlert } from './alerts';

const stripe = Stripe(
  'pk_test_51PxbEiEPJE2Ds09UoMkZMALWkCe7OW3tZ1Ka23I1imPej5gUoJYAXyQ4i1kqB8RUfkhmTs3IjGmSROqiX4HHRHvy00shfDwaZU',
);

export const bookTour = async (tourId) => {
  try {
    // Get checkout session from API
    const session = await axios(`/api/v1/bookings/checkout-session/${tourId}`);

    // Create checkout form + charge card
    await stripe.redirectToCheckout({
      sessionId: session.data.data.session.id, // axios data obj
    });
  } catch (err) {
    console.log(err);
    showAlert('error', err);
  }
};
