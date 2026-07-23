import { Route, Routes, useParams } from 'react-router-dom'
import { PublicLayout } from '@/layouts/PublicLayout'
import { AdminLayout, CustomerLayout, DriverLayout } from '@/layouts/DashboardLayout'
import { HomePage } from '@/pages/HomePage'
import {
  AirportPage,
  FactoryPage,
  IntercityPage,
  PricingPage,
  RoutesPage,
  SharedRidePage,
} from '@/pages/ServicePages'
import { SupportPage } from '@/pages/SupportPage'
import {
  AboutPage,
  FaqPage,
  LegalIndexPage,
  LegalPage,
  NotFoundPage,
  OfficePage,
} from '@/pages/ContentPages'
import { BookPage, BookSuccessPage, LookupPage } from '@/pages/BookingPages'
import { ContactPage } from '@/pages/ContactPage'
import { LoginPage, RegisterPage } from '@/pages/AuthPages'
import {
  CustomerBookingsPage,
  CustomerHomePage,
  CustomerNotificationsPage,
  CustomerProfilePage,
  CustomerSupportPage,
} from '@/pages/CustomerDashboard'
import {
  AdminAuditPage,
  AdminBookingsPage,
  AdminContentPage,
  AdminDriversPage,
  AdminHomePage,
  AdminSupportPage,
  AdminTripsPage,
  AdminVehiclesPage,
  DriverTripsPage,
} from '@/pages/AdminDashboard'

function LegalPageRoute() {
  const { slug } = useParams()
  return <LegalPage slug={slug ?? ''} />
}

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<HomePage />} />
        <Route path="dua-don-san-bay" element={<AirportPage />} />
        <Route path="xe-ghep" element={<SharedRidePage />} />
        <Route path="di-tinh" element={<IntercityPage />} />
        <Route path="dua-don-nha-may" element={<FactoryPage />} />
        <Route path="ho-tro-ho-so" element={<SupportPage />} />
        <Route path="bang-gia" element={<PricingPage />} />
        <Route path="tuyen-duong" element={<RoutesPage />} />
        <Route path="ve-chung-toi" element={<AboutPage />} />
        <Route path="tru-so-nagoya" element={<OfficePage />} />
        <Route path="faq" element={<FaqPage />} />
        <Route path="lien-he" element={<ContactPage />} />
        <Route path="dat-xe" element={<BookPage />} />
        <Route path="dat-xe/thanh-cong" element={<BookSuccessPage />} />
        <Route path="tra-cuu-booking" element={<LookupPage />} />
        <Route path="phap-ly" element={<LegalIndexPage />} />
        <Route path="phap-ly/:slug" element={<LegalPageRoute />} />
        <Route path="dang-nhap" element={<LoginPage />} />
        <Route path="dang-ky" element={<RegisterPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      <Route path="tai-khoan" element={<CustomerLayout />}>
        <Route index element={<CustomerHomePage />} />
        <Route path="booking" element={<CustomerBookingsPage />} />
        <Route path="ho-tro" element={<CustomerSupportPage />} />
        <Route path="thong-bao" element={<CustomerNotificationsPage />} />
        <Route path="ho-so" element={<CustomerProfilePage />} />
      </Route>

      <Route path="quan-tri" element={<AdminLayout />}>
        <Route index element={<AdminHomePage />} />
        <Route path="booking" element={<AdminBookingsPage />} />
        <Route path="chuyen" element={<AdminTripsPage />} />
        <Route path="tai-xe" element={<AdminDriversPage />} />
        <Route path="phuong-tien" element={<AdminVehiclesPage />} />
        <Route path="ho-tro" element={<AdminSupportPage />} />
        <Route path="noi-dung" element={<AdminContentPage />} />
        <Route path="audit" element={<AdminAuditPage />} />
      </Route>

      <Route path="tai-xe" element={<DriverLayout />}>
        <Route index element={<DriverTripsPage />} />
      </Route>
    </Routes>
  )
}
