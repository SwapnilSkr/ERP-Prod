'use client';
import { useAuth } from '@/context/user/userContext';
import {
  Avatar,
  Badge,
  Box,
  Button,
  CloseButton,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  Text,
  useToast,
  VStack,
} from '@chakra-ui/react';
import {
  BellIcon,
  Calendar,
  CalendarPlus,
  Handshake,
  HomeIcon as House,
  ListChecks,
  Megaphone,
  Menu,
  Newspaper,
  Scale,
  Users,
  View,
  X,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useNotif } from '../../../../hooks/useNotif';
import { Logs } from 'lucide-react';
import { NotepadTextIcon as Notepad } from 'lucide-react';
import EnhancedNotepadModal from '../../shared/NotepadModal';
import { useRealTimeAnnouncements } from '@/hooks/useRTAHook';
import { useAnnouncementHook } from '@/hooks/useAnnouncementHook';
import { Announcement } from '@/types/announcement';

const Navbar = () => {
  const [activeTab, setActiveTab] = useState('home');
  const { logout, authUser, role } = useAuth();
  const toast = useToast();
  const { listenToAnnouncements } = useRealTimeAnnouncements(
    (newAnnouncement) => {
      if (
        newAnnouncement.meantFor &&
        newAnnouncement.meantFor !== authUser?.uid
      ) {
        return;
      }
      newRealTimeAnnouncement(newAnnouncement);
      toast({
        title: newAnnouncement.title,
        description: newAnnouncement.message,
        status: 'info',
        duration: 9000,
        position: 'top',
        isClosable: true,
      });
    },
    (id: string) => {
      setAnnouncements((prev) =>
        prev.filter((announcement) => announcement.id !== id),
      );
    },
  );

  const {
    getAllAnnouncementsForUser,
    clearAnnouncementForUser,
    seeAllAnnouncementsForUser,
  } = useAnnouncementHook();
  const {
    clearNotification,
    markAsSeen,
    newNotif,
    seenNotif,
    clearAllNotifications,
  } = useNotif();

  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] =
    useState<boolean>(false);
  const [isNotepadOpen, setIsNotepadOpen] = useState<boolean>(false);
  const [isAnnouncementDrawerOpen, setIsAnnouncementDrawerOpen] =
    useState<boolean>(false);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [unreadAnnouncements, setUnreadAnnouncements] = useState<number>(0);

  const handleOpenNotificationDrawer = () => {
    try {
      newNotif.map(
        async (notification) => await markAsSeen(notification.id as string),
      );
      setIsNotificationDrawerOpen(false);
    } catch (error) {
      console.log('error');
    }
  };

  const handleCloseAnnouncementDrawer = () => {
    try {
      setIsAnnouncementDrawerOpen(false);
    } catch (error) {
      console.log('error');
    }
  };

  const handleOpenAnnouncementDrawer = async () => {
    try {
      await seeAllAnnouncementsForUser(authUser);
      setIsAnnouncementDrawerOpen(true);
      setAnnouncements((prevAnnouncements) =>
        prevAnnouncements.map((announcement) => ({
          ...announcement,
          seenBy: [...(announcement.seenBy || []), authUser?.uid].filter(
            Boolean,
          ) as string[],
        })),
      );
      setUnreadAnnouncements(0);
    } catch (error) {
      console.log('error');
    }
  };

  const clearAnnouncement = async (announcementP: Announcement) => {
    try {
      const publishedAt = new Date(announcementP.publishedAt);
      const currentDate = new Date();
      const daysDifference =
        (currentDate.getTime() - publishedAt.getTime()) / (1000 * 3600 * 24);

      if (daysDifference < 30) {
        toast({
          title: 'Cannot clear announcement',
          description:
            'Announcement cannot be cleared within 30 days of publishing',
          status: 'error',
          duration: 9000,
          position: 'top',
          isClosable: true,
        });
        return;
      }

      setAnnouncements(
        announcements.filter(
          (announcement) => announcement.id !== announcementP.id,
        ),
      );
      await clearAnnouncementForUser(announcementP.id, authUser);
    } catch (error) {
      console.error('Error clearing announcement:', error);
    }
  };

  const clearAllAnnouncements = async () => {
    try {
      const announcementsToClear = announcements.filter(
        (announcement: Announcement) => {
          const publishedAt = new Date(announcement.publishedAt);
          const currentDate = new Date();
          const daysDifference =
            (currentDate.getTime() - publishedAt.getTime()) /
            (1000 * 3600 * 24);

          return daysDifference >= 30;
        },
      );

      if (announcementsToClear.length < announcements.length) {
        toast({
          title: 'Cannot clear some announcements',
          description:
            'Some announcements cannot be cleared as they were published within 30 days.',
          status: 'error',
          duration: 9000,
          position: 'top',
          isClosable: true,
        });
      }

      setAnnouncements((prevAnnouncements) =>
        prevAnnouncements.filter((announcement) => {
          const publishedAt = new Date(announcement.publishedAt);
          const currentDate = new Date();
          const daysDifference =
            (currentDate.getTime() - publishedAt.getTime()) /
            (1000 * 3600 * 24);

          return daysDifference < 30;
        }),
      );
      await Promise.all(
        announcementsToClear.map((announcement) =>
          clearAnnouncementForUser(announcement.id, authUser),
        ),
      );
    } catch (error) {
      console.error('Error clearing announcements:', error);
      toast({
        title: 'Error',
        description: 'Could not clear announcements',
        status: 'error',
        duration: 9000,
        position: 'top',
        isClosable: true,
      });
    }
  };

  const countUnseenAnnouncements = (announcements: Announcement[]) => {
    if (!authUser) {
      return 0;
    }
    return announcements.filter(
      (announcement) =>
        !announcement.seenBy || !announcement.seenBy.includes(authUser?.uid),
    ).length;
  };

  const newRealTimeAnnouncement = (newAnnouncement: Announcement) => {
    console.log('New announcement:', newAnnouncement);
    setAnnouncements((prev) => [newAnnouncement, ...prev]);
  };

  useEffect(() => {
    const unsubscribe = listenToAnnouncements();

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    async function fetchAnnouncements() {
      const announcements = await getAllAnnouncementsForUser(authUser);
      setAnnouncements(announcements);
      setUnreadAnnouncements(countUnseenAnnouncements(announcements));
    }
    fetchAnnouncements();
  }, []);

  useEffect(() => {
    async function seeAll() {
      await seeAllAnnouncementsForUser(authUser);
      setIsAnnouncementDrawerOpen(true);
      setUnreadAnnouncements(0);
    }
    if (isAnnouncementDrawerOpen) {
      seeAll();
    } else {
      setUnreadAnnouncements(countUnseenAnnouncements(announcements));
    }
  }, [announcements, authUser]);

  useEffect(() => {
    const onHashChanged = () => {
      const _activeTab = window.location.hash;
      if (_activeTab !== '') {
        setActiveTab(_activeTab.replace('#', ''));
      }
    };

    window.addEventListener('hashchange', onHashChanged);

    return () => {
      window.removeEventListener('hashchange', onHashChanged);
    };
  }, []);

  useEffect(() => {
    setActiveTab(window.location.hash.replace('#', ''));
  }, []);

  const handleNavigation = (tab: string) => {
    window.location.href = `/dashboard/admin/workspace-admin#${tab}`;
    const url = new URL(window.location.href);
    url.search = '';
    window.history.pushState({}, '', url.toString());
  };

  return (
    <div className="flex items-center justify-between gap-6 px-4 py-3 shadow-md lg:justify-end">
      <Menu
        size={30}
        color="#6B46C1"
        className="cursor-pointer lg:hidden"
        onClick={() => setIsSidebarOpen(true)}
      />

      <div className="flex items-center justify-end gap-4">
        <Logs onClick={() => window.open('/logs')} cursor="pointer" />
        <BellIcon
          aria-label="Notifications"
          onClick={() => setIsNotificationDrawerOpen(true)}
          className="cursor-pointer"
        />
        {newNotif.length > 0 && (
          <Badge
            position="absolute"
            top="1"
            right="40"
            colorScheme="red"
            borderRadius="full"
            fontSize="0.8em"
            px={2}
          >
            {newNotif.length}
          </Badge>
        )}
        <Calendar onClick={() => window.open('/calendar')} cursor={'pointer'} />
        <Notepad onClick={() => setIsNotepadOpen(true)} cursor="pointer" />
        <Megaphone onClick={handleOpenAnnouncementDrawer} cursor="pointer" />
        {unreadAnnouncements > 0 && (
          <Badge
            position="absolute"
            top="1"
            right="12"
            colorScheme="red"
            borderRadius="full"
            fontSize="0.8em"
            px={2}
          >
            {unreadAnnouncements}
          </Badge>
        )}
        <Avatar
          name={authUser?.displayName || 'admin'}
          cursor={'pointer'}
          size={'sm'}
          onClick={() => window.open(`/user/${authUser?.uid}`)}
        />
      </div>
      <Drawer
        isOpen={isSidebarOpen}
        placement="left"
        onClose={() => setIsSidebarOpen(false)}
      >
        <DrawerOverlay />
        <DrawerContent bgColor={'#2f2f2f'}>
          <DrawerCloseButton autoFocus={false} _focus={{ outline: 0 }}>
            <X size={30} color="white" />
          </DrawerCloseButton>
          <DrawerHeader>
            <h2 className="heading-primary mb-4 text-center text-white">
              Lawspicious
            </h2>
            <section className="mb-4">
              <h3 className="mb-2 font-cabin text-lg font-semibold text-white">
                Howdy,
              </h3>
              <h1 className="heading-primary text-white">
                {authUser?.displayName}
              </h1>
              <Badge
                mt={2}
                colorScheme="orange"
                fontSize="xs"
                px={3}
                py={1}
                borderRadius="full"
              >
                Admin
              </Badge>
            </section>
          </DrawerHeader>
          <DrawerBody className="flex flex-col gap-6">
            <div className="z-50 h-full bg-bgPrimary text-sm text-white md:text-base">
              <ul>
                <li
                  className={`mb-3 flex cursor-pointer items-center gap-3 rounded-lg p-3 hover:bg-bgSecondary ${
                    activeTab === 'home' ? 'bg-bgSecondary' : ''
                  }`}
                  onClick={() => handleNavigation('home')}
                >
                  <House size={20} />
                  <span>Home</span>
                </li>
                <li
                  className={`mb-3 flex cursor-pointer items-center gap-3 rounded-lg p-3 hover:bg-bgSecondary ${
                    activeTab === 'case' ? 'bg-bgSecondary' : ''
                  }`}
                  onClick={() => handleNavigation('case')}
                >
                  <Scale size={20} />
                  <span>Cases</span>
                </li>
                <li
                  className={`mb-3 flex cursor-pointer items-center gap-3 rounded-lg p-3 hover:bg-bgSecondary ${
                    activeTab === 'client' ? 'bg-bgSecondary' : ''
                  }`}
                  onClick={() => handleNavigation('client')}
                >
                  <Handshake size={20} />
                  <span>Clients</span>
                </li>
                <li
                  className={`mb-3 flex cursor-pointer items-center gap-3 rounded-lg p-3 hover:bg-bgSecondary ${
                    activeTab === 'appointment' ? 'bg-bgSecondary' : ''
                  }`}
                  onClick={() => handleNavigation('appointment')}
                >
                  <CalendarPlus size={20} />
                  <span>Appointment</span>
                </li>
                {role === 'SUPERADMIN' && (
                  <li
                    className={`mb-3 flex cursor-pointer items-center gap-3 rounded-lg p-3 hover:bg-bgSecondary ${
                      activeTab === 'announcement' ? 'bg-bgSecondary' : ''
                    }`}
                    onClick={() => handleNavigation('announcement')}
                  >
                    <Megaphone size={20} />
                    <span>Announcement</span>
                  </li>
                )}
                <li
                  className={`mb-3 flex cursor-pointer items-center gap-3 rounded-lg p-3 hover:bg-bgSecondary ${
                    activeTab === 'team' ? 'bg-bgSecondary' : ''
                  }`}
                  onClick={() => handleNavigation('team')}
                >
                  <Users size={20} />
                  <span>Team</span>
                </li>
                <li
                  className={`mb-3 flex cursor-pointer items-center gap-3 rounded-lg p-3 hover:bg-bgSecondary ${
                    activeTab === 'task' ? 'bg-bgSecondary' : ''
                  }`}
                  onClick={() => handleNavigation('task')}
                >
                  <ListChecks size={20} />
                  <span>Task</span>
                </li>
                <li
                  className={`mb-3 flex cursor-pointer items-center gap-3 rounded-lg p-3 hover:bg-bgSecondary ${activeTab.includes('invoice') ? 'bg-bgSecondary' : ''}`}
                >
                  <Newspaper size={20} />
                  <span>Invoice</span>
                </li>
                <ul className="pl-6">
                  <li
                    className={`mb-3 flex cursor-pointer items-center gap-3 rounded-lg p-3 hover:bg-bgSecondary ${window.location.hash === '#client-invoices' ? 'bg-bgSecondary' : ''}`}
                    onClick={() => handleNavigation('client-invoices')}
                  >
                    <span>Client Invoices</span>
                  </li>
                  <li
                    className={`mb-3 flex cursor-pointer items-center gap-3 rounded-lg p-3 hover:bg-bgSecondary ${window.location.hash === '#organization-invoices' ? 'bg-bgSecondary' : ''}`}
                    onClick={() => handleNavigation('organization-invoices')}
                  >
                    <span>Organization Invoices</span>
                  </li>
                </ul>
              </ul>
              <Button
                colorScheme="purple"
                className="w-full"
                my={8}
                onClick={logout}
              >
                Logout
              </Button>
            </div>
          </DrawerBody>
        </DrawerContent>
      </Drawer>

      {/* Notification Drawer */}
      <Drawer
        onClose={() => handleOpenNotificationDrawer()}
        isOpen={isNotificationDrawerOpen}
      >
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton className="text-white" />
          <DrawerHeader className="bg-purple-500">
            <h1 className="font-bold text-white">Notification</h1>{' '}
            <Button
              colorScheme="purple"
              className="w-full"
              my={8}
              onClick={clearAllNotifications}
            >
              Clear All Notification
            </Button>
          </DrawerHeader>

          <DrawerBody>
            <VStack spacing={4} align="stretch">
              {newNotif.length > 0 ? (
                newNotif.map((notification) => (
                  <Box
                    key={notification.id}
                    p={4}
                    shadow="md"
                    borderWidth="1px"
                    borderRadius="lg"
                    bg={'gray.100'}
                    cursor={'pointer'}
                    _hover={{ backgroundColor: 'gray.100' }}
                    className="div flex flex-col"
                  >
                    <Box className="flex justify-between">
                      <View
                        onClick={() =>
                          (window.location.href = `/${notification.type.toLowerCase()}/${notification.appointmentId || notification.taskId || notification.caseId}`)
                        }
                        className="hover:text-purple-500"
                      />
                      <CloseButton
                        onClick={() => {
                          clearNotification(notification.id as string);
                        }}
                      />
                    </Box>
                    <Text fontWeight="semibold">
                      {notification.notificationName}
                    </Text>
                    {notification.caseNo && (
                      <Text>Case No: {notification.caseNo}</Text>
                    )}
                    {notification.taskName && (
                      <Text>Task: {notification.taskName}</Text>
                    )}
                    {notification.appointmentName && (
                      <Text>Appointment: {notification.appointmentName}</Text>
                    )}
                    <Text fontSize="sm" color="gray.500">
                      Status: New
                    </Text>
                  </Box>
                ))
              ) : (
                <Text>No new notifications available.</Text>
              )}
              {seenNotif.length > 0 ? (
                seenNotif.map((notification) => (
                  <Box
                    key={notification.id}
                    p={4}
                    shadow="md"
                    borderWidth="1px"
                    borderRadius="lg"
                    bg={'white'}
                    cursor={'pointer'}
                    _hover={{ backgroundColor: 'gray.100' }}
                    className="div flex flex-col"
                  >
                    <Box className="flex justify-between">
                      <View
                        onClick={() =>
                          (window.location.href = `/${notification.type.toLowerCase()}/${notification.appointmentId || notification.taskId || notification.caseId}`)
                        }
                        className="hover:text-purple-500"
                      />
                      <CloseButton
                        onClick={() => {
                          clearNotification(notification.id as string);
                        }}
                      />
                    </Box>
                    <Text fontWeight="semibold">
                      {notification.notificationName}
                    </Text>
                    {notification.caseNo && (
                      <Text>Case No: {notification.caseNo}</Text>
                    )}
                    {notification.taskName && (
                      <Text>Task: {notification.taskName}</Text>
                    )}
                    {notification.appointmentName && (
                      <Text>Appointment: {notification.appointmentName}</Text>
                    )}
                    <Text fontSize="sm" color="gray.500">
                      Status: Seen
                    </Text>
                  </Box>
                ))
              ) : (
                <Text></Text>
              )}
            </VStack>
          </DrawerBody>

          <DrawerFooter>
            <Text fontSize="sm" color="gray.500">
              End of notifications
            </Text>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Announcement Drawer */}
      <Drawer
        onClose={() => handleCloseAnnouncementDrawer()}
        isOpen={isAnnouncementDrawerOpen}
      >
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton className="text-white" />
          <DrawerHeader className="bg-purple-500">
            <h1 className="font-bold text-white">Announcements</h1>{' '}
            <Button
              colorScheme="purple"
              className="w-full"
              my={8}
              onClick={clearAllAnnouncements}
            >
              Clear All Announcements
            </Button>
          </DrawerHeader>

          <DrawerBody>
            <VStack spacing={4} align="stretch">
              {announcements.length > 0 ? (
                announcements.map((announcement) => (
                  <Box
                    key={announcement.id}
                    p={4}
                    shadow="md"
                    borderWidth="1px"
                    borderRadius="lg"
                    bg={
                      announcement.priority === 'high'
                        ? 'red.100'
                        : announcement.priority === 'medium'
                          ? 'yellow.100'
                          : 'green.100'
                    }
                    cursor={'pointer'}
                    _hover={{
                      backgroundColor:
                        announcement.priority === 'high'
                          ? 'red.200'
                          : announcement.priority === 'medium'
                            ? 'yellow.200'
                            : 'green.200',
                    }}
                    className="div flex flex-col"
                  >
                    <Box className="flex justify-between">
                      <View className="hover:text-purple-500" />
                      <CloseButton
                        onClick={() => {
                          clearAnnouncement(announcement);
                        }}
                      />
                    </Box>
                    <Text fontWeight="semibold">{announcement.title}</Text>
                    {announcement.message && (
                      <Text>Message: {announcement.message}</Text>
                    )}
                  </Box>
                ))
              ) : (
                <Text>No announcements available.</Text>
              )}
            </VStack>
          </DrawerBody>

          <DrawerFooter>
            <Text fontSize="sm" color="gray.500">
              End of announcements
            </Text>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
      <EnhancedNotepadModal
        isOpen={isNotepadOpen}
        onClose={() => setIsNotepadOpen(false)}
      />
    </div>
  );
};

export default Navbar;
