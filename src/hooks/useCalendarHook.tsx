import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/config/firebase.config';
import { useAuth } from '@/context/user/userContext';
import { useToast } from '@chakra-ui/react';
import { useGoogleLogin } from '@react-oauth/google';
import axios from 'axios';

interface ICalendarEvent {
  title: string;
  start: string;
  resourceId: string;
  color?: string;
  url: string;
  lawyerId?: string;
  lawyerName?: string;
}

const useCalendarEventss = () => {
  const [calendarEvents, setCalendarEvents] = useState<ICalendarEvent[]>([]);
  const [adminCalendarEvents, setAdminCalendarEvents] = useState<
    ICalendarEvent[]
  >([]);
  const { authUser, role } = useAuth();
  const userId = authUser?.uid;
  const toast = useToast();
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const googleLogin = useGoogleLogin({
    onSuccess: (response) => setGoogleToken(response.access_token),
    onError: (error) => console.error('Google Login Error:', error),
    scope: 'https://www.googleapis.com/auth/calendar', // Add this line for full calendar access
  });

  //   const GOOGLE_CALENDAR_ID = authUser?.email;
  const GOOGLE_CALENDAR_ID = 'nandakrishnarjun@gmail.com';
  // Function to insert an event to Google Calendar
  const insertEventToGoogleCalendar = useCallback(
    async (event: ICalendarEvent) => {
      if (!googleToken) {
        googleLogin();
        return;
      }

      const startDateTime = new Date(event.start).toISOString();
      const endDateTime = new Date(
        new Date(event.start).getTime() + 60 * 60 * 1000,
      ).toISOString();

      try {
        const response = await axios.post(
          `https://www.googleapis.com/calendar/v3/calendars/${GOOGLE_CALENDAR_ID}/events`,
          {
            summary: event.title,
            start: {
              dateTime: startDateTime,
              timeZone: 'Asia/Kolkata',
            },
            end: {
              dateTime: endDateTime,
              timeZone: 'Asia/Kolkata',
            },
          },
          {
            headers: {
              Authorization: `Bearer ${googleToken}`,
            },
          },
        );

        console.log('Google Calendar Event Created:', response.data.htmlLink);
        toast({
          title: 'Event Added to Google Calendar',
          description:
            'The event has been added to your Google Calendar successfully.',
          status: 'success',
          duration: 4000,
          isClosable: true,
        });
      } catch (error) {
        console.error('Error adding event to Google Calendar:', error);
        toast({
          title: 'Google Calendar Error',
          description: 'Failed to add the event to Google Calendar.',
          status: 'error',
          duration: 4000,
          isClosable: true,
        });
      }
    },
    [googleToken, toast, googleLogin, GOOGLE_CALENDAR_ID],
  );

  // Function to add a new event to Firestore and Google Calendar
  const createNewEvent = useCallback(
    async (event: Partial<ICalendarEvent>) => {
      if (!userId) return;

      try {
        const eventsCollectionRef = collection(db, `users/${userId}/events`);
        const firestoreEvent = await addDoc(eventsCollectionRef, {
          title: event.title,
          start: event.start,
        });

        const newEvent = {
          title: event.title!,
          start: event.start!,
          resourceId: firestoreEvent.id,
          color: event.color || 'blue',
          url: `/users/${userId}/events/${firestoreEvent.id}`,
        };

        setCalendarEvents((prev) => [...prev, newEvent]);
        await insertEventToGoogleCalendar(newEvent);

        toast({
          title: 'Event Created',
          description: 'The event has been created successfully.',
          status: 'success',
          duration: 4000,
          isClosable: true,
        });
      } catch (error) {
        console.error('Error creating new event:', error);
        toast({
          title: 'Error',
          description:
            'Error creating the event in Firestore or Google Calendar.',
          status: 'error',
          duration: 4000,
          isClosable: true,
        });
      }
    },
    [userId, toast, insertEventToGoogleCalendar],
  );

  // Fetch and sync lawyer-specific events
  const fetchAndSyncEvents = useCallback(async () => {
    if (!userId || role !== 'LAWYER') return;

    const tasksQuery = query(
      collection(db, 'tasks'),
      where('lawyerDetails.id', '==', userId),
    );
    const casesQuery = query(
      collection(db, 'cases'),
      where('lawyer.id', '==', userId),
      where('caseStatus', '==', 'RUNNING'),
    );
    const appointmentsQuery = query(
      collection(db, 'appointments'),
      where('lawyerDetails.id', '==', userId),
      where('status', '==', 'PENDING'),
    );
    const eventsQuery = query(collection(db, `users/${userId}/events`));

    try {
      const tasksSnapshot = await getDocs(tasksQuery);
      const taskEvents = tasksSnapshot.docs.map((doc) => ({
        title: 'Task Deadline',
        start: doc.data().endDate,
        resourceId: doc.id,
        url: `/task/${doc.id}`,
        color: 'blue',
      }));

      const casesSnapshot = await getDocs(casesQuery);
      const caseEvents = casesSnapshot.docs.map((doc) => ({
        title: 'Next Hearing',
        start: doc.data().nextHearing,
        resourceId: doc.id,
        color: 'green',
        url: `/case/${doc.id}`,
      }));

      const appointmentSnapshot = await getDocs(appointmentsQuery);
      const appointmentEvents = appointmentSnapshot.docs.map((doc) => ({
        title: 'Appointment',
        start: doc.data().date,
        resourceId: doc.id,
        color: 'purple',
        url: `/appointments/${doc.id}`,
      }));

      const eventsSnapshot = await getDocs(eventsQuery);
      const otherEvents = eventsSnapshot.docs.map((doc) => ({
        title: doc.data().title,
        start: doc.data().start, // Assuming date is a Firestore Timestamp
        resourceId: doc.id,
        color: 'orange',
        url: `/http://lawspicious.verecel.app/dashboard/lawyer/workspace-lawyer#task`,
      }));

      const allEvents = [
        ...taskEvents,
        ...caseEvents,
        ...appointmentEvents,
        ...otherEvents,
      ];
      setCalendarEvents(allEvents);

      // Sync to Google Calendar if googleToken is available
      if (googleToken) {
        await Promise.all(
          allEvents.map((event) => insertEventToGoogleCalendar(event)),
        );
      }
    } catch (error) {
      console.error('Error fetching and syncing events:', error);
    }
  }, [userId, googleToken, insertEventToGoogleCalendar]);

  // Fetch and sync admin-specific events
  const fetchAndSyncAdminEvents = useCallback(async () => {
    if (!userId || (role !== 'ADMIN' && role !== 'SUPERADMIN')) return;

    const tasksQuery = query(
      collection(db, 'tasks'),
      where('taskStatus', '==', 'PENDING'),
    );
    const casesQuery = query(
      collection(db, 'cases'),
      where('caseStatus', '==', 'RUNNING'),
    );
    const appointmentsQuery = query(
      collection(db, 'appointments'),
      where('status', '==', 'PENDING'),
    );
    const invoicesQuery = query(
      collection(db, 'invoices'),
      where('paymentStatus', '==', 'pending'),
    );
    const eventsQuery = query(collection(db, `users/${userId}/events`));

    try {
      const tasksSnapshot = await getDocs(tasksQuery);
      const taskEvents = tasksSnapshot.docs.map((doc) => ({
        title: `Deadline task: ${doc.data().taskName}`,
        start: doc.data().endDate,
        resourceId: doc.id,
        url: `/task/${doc.id}`,
        color: 'red',
        lawyerId: doc.data().lawyerDetails.id,
        lawyerName: doc.data().lawyerDetails.name,
      }));

      const casesSnapshot = await getDocs(casesQuery);
      const caseEvents = casesSnapshot.docs.map((doc) => ({
        title: 'Next Hearing',
        start: doc.data().nextHearing,
        resourceId: doc.id,
        color: 'green',
        url: `/case/${doc.id}`,
      }));

      const appointmentSnapshot = await getDocs(appointmentsQuery);
      const appointmentEvents = appointmentSnapshot.docs.map((doc) => ({
        title: 'Appointment',
        start: doc.data().date,
        resourceId: doc.id,
        color: 'purple',
        url: `/appointments/${doc.id}`,
      }));

      const invoiceSnapshot = await getDocs(invoicesQuery);
      const invoiceEvents = invoiceSnapshot.docs.map((doc) => ({
        title: `Due Date for Invoice: ₹${doc.data().totalAmount}`,
        start: doc.data().dueDate,
        resourceId: doc.id,
        color: 'blue',
        url: `/invoices/${doc.id}`,
      }));

      const eventsSnapshot = await getDocs(eventsQuery);
      const otherEvents = eventsSnapshot.docs.map((doc) => ({
        title: doc.data().title,
        start: doc.data().start, // Assuming date is a Firestore Timestamp
        resourceId: doc.id,
        color: 'orange',
        url: `/http://lawspicious.verecel.app/dashboard/lawyer/workspace-lawyer#task`,
      }));

      const allAdminEvents = [
        ...taskEvents,
        ...caseEvents,
        ...appointmentEvents,
        ...invoiceEvents,
        ...otherEvents,
      ];
      setAdminCalendarEvents(allAdminEvents);

      // Sync to Google Calendar if googleToken is available
      if (googleToken) {
        await Promise.all(
          allAdminEvents.map((event) => insertEventToGoogleCalendar(event)),
        );
      }
    } catch (error) {
      console.error('Error fetching and syncing admin events:', error);
    }
  }, [userId, googleToken, insertEventToGoogleCalendar]);

  useEffect(() => {
    if (role === 'ADMIN' || role === 'SUPERADMIN') {
      fetchAndSyncAdminEvents();
    } else {
      fetchAndSyncEvents();
    }
  }, [fetchAndSyncEvents, fetchAndSyncAdminEvents, role]);

  return { calendarEvents, adminCalendarEvents, createNewEvent };
};

export default useCalendarEventss;
