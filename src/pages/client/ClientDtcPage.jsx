import { useEffect } from 'react';
import ClientHeader from '../../components/layout/ClientHeader';
import { portfolioApi } from '../../api/endpoints/portfolio';
import DtcPageBase from '../dtc/DtcPageBase';

const resolveOwnerId = (user) =>
    user?.client_id ?? user?.clientId ?? user?.identity_id ?? user?.identityId ?? user?.id;

export default function ClientDtcPage() {
    useEffect(() => { document.title = 'RAFBank | DTC'; }, []);
    return (
        <DtcPageBase
            HeaderComponent={ClientHeader}
            breadcrumb="Moj nalog"
            resolveOwnerId={resolveOwnerId}
            fetchPortfolio={portfolioApi.getClientPortfolio}
            isClient
        />
    );
}
