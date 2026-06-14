import { useEffect } from 'react';
import Navbar from '../../components/layout/Navbar';
import { portfolioApi } from '../../api/endpoints/portfolio';
import DtcPageBase from '../dtc/DtcPageBase';

const resolveOwnerId = (user) =>
    user?.employee_id ?? user?.employeeId ?? user?.actuary_id ?? user?.actuaryId ?? user?.identity_id ?? user?.identityId ?? user?.id;

export default function DtcPage() {
    useEffect(() => { document.title = 'RAFBank | DTC'; }, []);
    return (
        <DtcPageBase
            HeaderComponent={Navbar}
            breadcrumb="Tržište"
            resolveOwnerId={resolveOwnerId}
            fetchPortfolio={portfolioApi.getActuaryPortfolio}
            isClient={false}
        />
    );
}
